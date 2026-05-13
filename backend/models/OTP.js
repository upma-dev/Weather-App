const mongoose = require("mongoose");

// Stores OTP attempts — embedded in User model too, but this gives a separate audit trail
const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true },
    otpHash: { type: String, required: true },   // bcrypt hash of the 6-digit OTP
    purpose: { type: String, enum: ["verify", "reset"], required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-delete documents after they expire (TTL index)
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("OTP", otpSchema);
