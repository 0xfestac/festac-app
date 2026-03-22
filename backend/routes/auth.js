require("dotenv").config();

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const { Resend } = require("resend");

const SECRET = process.env.JWT_SECRET;
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Store OTPs temporarily ──
const otpStore = new Map();

// ── Send OTP ──
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;

    otpStore.set(email, { otp, expires });

    await resend.emails.send({
      from: "Festac Wallet <onboarding@resend.dev>",
      to: email,
      subject: "Your Festac OTP Code",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0a0a0a;color:#f5f0e8;padding:40px;border-radius:16px;border:1px solid rgba(201,168,76,0.2)">
          <div style="text-align:center;margin-bottom:32px">
            <h1 style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#f0c040,#c9a84c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0">Festac</h1>
            <p style="color:#5a5248;font-size:13px;margin-top:6px">Your money, simplified</p>
          </div>
          <h2 style="font-size:18px;font-weight:700;margin-bottom:8px">Verify your email</h2>
          <p style="color:#8a7e6e;font-size:14px;line-height:1.6;margin-bottom:28px">Enter the code below to complete your registration. This code expires in <strong style="color:#f5f0e8">10 minutes</strong>.</p>
          <div style="background:#1a1a1a;border:1px solid rgba(201,168,76,0.2);border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
            <div style="font-size:42px;font-weight:800;letter-spacing:16px;color:#c9a84c">${otp}</div>
          </div>
          <p style="color:#5a5248;font-size:12px;text-align:center">If you did not request this, please ignore this email.</p>
        </div>
      `
    });

    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

// ── Register ──
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: "Please enter your full name" });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const stored = otpStore.get(email);
    if (!stored) {
      return res.status(400).json({ message: "OTP not found. Please request a new one" });
    }
    if (Date.now() > stored.expires) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP has expired. Please request a new one" });
    }
    if (stored.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP. Please try again" });
    }

    otpStore.delete(email);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name: name.trim(), email, password: hashed, balance: 0.99 });
    await user.save();

    resend.emails.send({
      from: "Festac Wallet <onboarding@resend.dev>",
      to: email,
      subject: "Welcome to Festac! 🎉",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0a0a0a;color:#f5f0e8;padding:40px;border-radius:16px;border:1px solid rgba(201,168,76,0.2)">
          <div style="text-align:center;margin-bottom:32px">
            <h1 style="font-size:28px;font-weight:800;background:linear-gradient(135deg,#f0c040,#c9a84c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0">Festac</h1>
          </div>
          <h2 style="font-size:18px;font-weight:700">Welcome, ${name.trim()}! 👋</h2>
          <p style="color:#8a7e6e;font-size:14px;line-height:1.6;margin-top:12px">Your Festac wallet is ready. You've been credited with <strong style="color:#c9a84c">$0.99</strong> to get started.</p>
          <p style="color:#8a7e6e;font-size:14px;line-height:1.6;margin-top:12px">Remember to set your transaction PIN before sending money.</p>
          <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06)">
            <p style="color:#5a5248;font-size:12px;text-align:center">Festac Wallet — Your money, simplified</p>
          </div>
        </div>
      `
    }).catch(console.error);

    res.json({ message: "Account created successfully", balance: user.balance });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Login ──
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "No account found with this email" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email, name: user.name },
      SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Set PIN ──
router.post("/set-pin", auth, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length !== 4) {
      return res.status(400).json({ message: "PIN must be 4 digits" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    user.pin = hashedPin;
    await user.save();

    res.json({ message: "PIN set successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
Also update your package.json — remove nodemailer and add resend:
"dependencies": {
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5",
  "dotenv": "^16.0.0",
  "express": "^4.18.2",
  "jsonwebtoken": "^9.0.0",
  "mongoose": "^7.0.0",
  "resend": "^3.2.0"
}