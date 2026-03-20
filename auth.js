require("dotenv").config();

const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");

const SECRET = process.env.JWT_SECRET;

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashed,
      balance: 0.99
    });

    await user.save();

    res.json({ message: "User created", balance: user.balance });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).send("User not found");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).send("Invalid password");

    const token = jwt.sign({ id: user._id, role: user.role }, SECRET, { expiresIn: "7d" });

    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Set PIN
router.post("/set-pin", auth, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length !== 4) {
      return res.status(400).send("PIN must be 4 digits");
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).send("User not found");

    const hashedPin = await bcrypt.hash(pin, 10);
    user.pin = hashedPin;

    await user.save();

    res.send("PIN set successfully");

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;;