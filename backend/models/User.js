const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  type: String,
  amount: Number,
  to: String,
  from: String,
  date: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  pin: String,
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },
  dailySent: { type: Number, default: 0 },
  lastReset: { type: Date, default: Date.now },
  transactions: [transactionSchema]
});

module.exports = mongoose.model("User", userSchema);