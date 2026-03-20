const router = require("express").Router();
const User = require("../models/User");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

// 💰 Fund user account
router.post("/fund", auth, admin, async (req, res) => {
  try {
    const { email, amount } = req.body;

    if (!email || !amount) {
      return res.status(400).json("All fields required");
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json("User not found");
    }

    user.balance += Number(amount);
    await user.save();

    res.json({
      message: "Account funded successfully",
      newBalance: user.balance
    });

  } catch (err) {
    res.status(500).json(err.message);
  }
});

module.exports = router;
