require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const walletRoutes = require("./routes/wallet");
const adminRoutes = require("./routes/admin");

const app = express();

// ✅ Middleware
app.use(cors({
  origin: [
    "https://festac-app101.vercel.app",
    "https://festac-app0x.vercel.app",
    "https://festac-app.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:5500"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// ✅ Test route
app.get("/", (req, res) => {
  res.json({ message: "FESTAC IS ACTIVE 🔥" });
});

// ✅ DB connection
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ FESTAC_DB Connected"))
  .catch(err => console.log("❌ ERROR:", err.message));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/admin", adminRoutes);

// ✅ 404 handler (JSON)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 FESTAC running on port ${PORT}`);
});