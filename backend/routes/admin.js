const router = require("express").Router();
const User = require("../models/User");
const FundRequest = require("../models/FundRequest");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

// ✅ Get all pending fund requests
router.get("/fund-requests", auth, admin, async (req, res) => {
  try {
    const requests = await FundRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Approve fund request
router.post("/fund-requests/:id/approve", auth, admin, async (req, res) => {
  try {
    const request = await FundRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    const user = await User.findById(request.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.balance += request.amount;
    user.transactions.push({
      type: "credit",
      amount: request.amount,
      from: "Bank Transfer"
    });
    await user.save();

    request.status = "approved";
    await request.save();

    res.json({ message: "Request approved and wallet credited" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Reject fund request
router.post("/fund-requests/:id/reject", auth, admin, async (req, res) => {
  try {
    const { note } = req.body;
    const request = await FundRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    request.status = "rejected";
    request.note = note || "";
    await request.save();

    res.json({ message: "Request rejected" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Fund user account directly
router.post("/fund", auth, admin, async (req, res) => {
  try {
    const { email, amount } = req.body;
    if (!email || !amount) return res.status(400).json("All fields required");
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json("User not found");
    user.balance += Number(amount);
    await user.save();
    res.json({ message: "Account funded successfully", newBalance: user.balance });
  } catch (err) {
    res.status(500).json(err.message);
  }
});

// ✅ Get all users
router.get("/users", auth, admin, async (req, res) => {
  try {
    const users = await User.find().select("-password -pin");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;