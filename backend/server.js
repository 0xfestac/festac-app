require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const walletRoutes = require("./routes/wallet");
const adminRoutes = require("./routes/admin");

const app = express();

// middleware (must come before routes)
app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("FESTAC IS ACTIVE 🔥");
});

// connect DB
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ FESTAC_DB Connected"))
  .catch(err => console.log("❌ ERROR:", err.message));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).send("Route not found");
});

// start server
app.listen(5000, () => {
  console.log("🚀 FESTAC is up and running on port 5000");
});