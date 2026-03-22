const mongoose = require("mongoose");

const fundRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, required: true },
  amount: { type: Number, required: true },
  creditedAmount: { type: Number, default: 0 },
  senderName: { type: String, required: true },
  senderBank: { type: String, required: true },
  reference: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  note: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("FundRequest", fundRequestSchema);