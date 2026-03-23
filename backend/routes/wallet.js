const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");
const mongoose = require("mongoose");
const FundRequest = require("../models/FundRequest");

router.get("/balance", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ balance: user.balance });
  } catch (err) {
    res.status(500).send("Failed to get balance");
  }
});

router.post("/fund", auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return res.status(400).send("Invalid amount");
    const user = await User.findById(req.user.id);
    user.balance += amt;
    user.transactions.push({ type: "credit", amount: amt, from: "self" });
    await user.save();
    res.json({ message: "Wallet funded", balance: user.balance });
  } catch (err) {
    res.status(500).send("Funding failed");
  }
});

router.post("/send", auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    let { toEmail, amount, pin } = req.body;
    if (!toEmail || !amount || !pin) throw new Error("All fields required");
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) throw new Error("Invalid amount");
    if (amt > 50) throw new Error("Max transfer is $50");
    const sender = await User.findById(req.user.id).session(session);
    const receiver = await User.findOne({ email: toEmail }).session(session);
    if (!sender) throw new Error("Sender not found");
    if (!receiver) throw new Error("Receiver not found");
    if (sender.email === toEmail) throw new Error("Cannot send to yourself");
    if (!sender.pin) throw new Error("Set PIN first");
    const validPin = await bcrypt.compare(pin, sender.pin);
    if (!validPin) throw new Error("Invalid PIN");
    const today = new Date().toDateString();
    const last = sender.lastReset ? new Date(sender.lastReset).toDateString() : null;
    if (today !== last) { sender.dailySent = 0; sender.lastReset = new Date(); }
    if ((sender.dailySent || 0) + amt > 2000) throw new Error("Daily limit reached");
    if (sender.balance < amt) throw new Error("Insufficient balance");
    sender.balance -= amt;
    receiver.balance += amt;
    sender.dailySent = (sender.dailySent || 0) + amt;
    sender.transactions.push({ type: "debit", amount: amt, to: toEmail });
    receiver.transactions.push({ type: "credit", amount: amt, from: sender.email });
    await sender.save({ session });
    await receiver.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.json({ message: "Transfer successful", balance: sender.balance });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).send(err.message);
  }
});

router.get("/transactions", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user.transactions.slice().reverse());
  } catch (err) {
    res.status(500).send("Failed to fetch transactions");
  }
});

router.post("/fund-request", auth, async (req, res) => {
  try {
    const { amount, senderName, senderBank, reference } = req.body;
    if (!amount || !senderName || !senderBank || !reference) {
      return res.status(400).json({ message: "All fields required" });
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return res.status(400).json({ message: "Invalid amount" });
    const user = await User.findById(req.user.id);
    const request = new FundRequest({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      amount: amt,
      senderName,
      senderBank,
      reference,
      status: "pending"
    });
    await request.save();
    res.json({ message: "Fund request submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/fund-requests", auth, async (req, res) => {
  try {
    const requests = await FundRequest.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/crypto-request", auth, async (req, res) => {
  try {
    const { coin, amount, hash, network } = req.body;
    if (!coin || !amount || !hash || !network) {
      return res.status(400).json({ message: "All fields required" });
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return res.status(400).json({ message: "Invalid amount" });
    const user = await User.findById(req.user.id);
    const request = new FundRequest({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      amount: amt,
      senderName: hash,
      senderBank: network,
      reference: `${coin} — ${hash}`,
      status: "pending"
    });
    await request.save();
    res.json({ message: "Crypto request submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ VERIFY TRANSACTION
router.get("/verify/:txId", auth, async (req, res) => {
  try {
    const { txId } = req.params;
    const user = await User.findById(req.user.id);

    // Search in user's own transactions first
    let tx = user.transactions.id(txId);
    let role = tx ? (tx.type === "debit" ? "sender" : "receiver") : null;

    // If not found search all users
    if (!tx) {
      const allUsers = await User.find({
        "transactions._id": txId
      });

      for (const u of allUsers) {
        const found = u.transactions.id(txId);
        if (found) {
          // Check if logged in user is sender or receiver
          if (found.type === "debit" && u._id.toString() === req.user.id) {
            tx = found;
            role = "sender";
            break;
          }
          if (found.type === "credit") {
            // Check if logged in user is the receiver
            if (u._id.toString() === req.user.id) {
              tx = found;
              role = "receiver";
              break;
            }
            // Check if logged in user is the sender
            if (found.from === user.email) {
              tx = found;
              role = "sender";
              break;
            }
          }
        }
      }
    }

    if (!tx) {
      return res.status(404).json({ message: "Transaction not found or you are not authorized to view it" });
    }

    res.json({
      txId: tx._id,
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      from: tx.from || null,
      to: tx.to || null,
      status: "confirmed",
      role
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
