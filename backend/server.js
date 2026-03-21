require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const walletRoutes = require("./routes/wallet");
const adminRoutes = require("./routes/admin");

const app = express();

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

app.get("/", (req, res) => {
  res.send("FESTAC IS ACTIVE 🔥");
});

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ FESTAC_DB Connected"))
  .catch(err => console.log("❌ ERROR:", err.message));

app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).send("Route not found");
});

app.listen(process.env.PORT || 5000, () => {
  console.log("🚀 FESTAC is up and running");
});