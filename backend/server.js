require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const weatherRoutes = require("./routes/weather");

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/weather", weatherRoutes);

app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "WeatherApp API is running 🌤️" })
);

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error." });
});

// ─── MongoDB + Start ──────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");
    // Drop indexes that exist in DB but not on the current schema (e.g. old `username` unique).
    try {
      const User = require("./models/User");
      const dropped = await User.syncIndexes();
      if (dropped?.length) console.log("🧹 Removed stale indexes:", dropped.join(", "));
    } catch (err) {
      console.warn("⚠️ Index sync skipped:", err.message);
    }
    const port = Number(process.env.PORT) || 5000;
    const server = app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `❌ Port ${port} is already in use. Stop the other Node process (or change PORT in .env), then start the backend again.`
        );
      } else {
        console.error("❌ Server failed to start:", err.message);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
