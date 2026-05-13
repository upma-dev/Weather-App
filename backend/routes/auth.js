const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const OTP = require("../models/OTP");
const { sendOTPEmail } = require("../utils/mailer");
const { generateOTP, hashOTP, verifyOTP } = require("../utils/otpHelper");

// ─── Helper: sign JWT ────────────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// ─── POST /api/auth/register ─────────────────────────────────────────────────
// Creates account, sends 6-digit OTP to email
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "All fields required." });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: "Email already registered." });

    // Create user (unverified)
    const user = await User.create({ name, email, password });

    // Generate & store OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await OTP.create({ email, otpHash, purpose: "verify", expiresAt });

    // Send email
    await sendOTPEmail(email, otp, "verify");

    res.status(201).json({
      success: true,
      message: "Account created! Check your email for the 6-digit OTP.",
      email,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
// Verifies email OTP → marks user verified, returns JWT
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await OTP.findOne({
      email,
      purpose: "verify",
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord)
      return res.status(400).json({ success: false, message: "OTP expired or invalid." });

    const valid = await verifyOTP(otp, otpRecord.otpHash);
    if (!valid)
      return res.status(400).json({ success: false, message: "Incorrect OTP." });

    // Mark used
    otpRecord.used = true;
    await otpRecord.save();

    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    ).select("-password -otp");

    const token = signToken(user._id);

    res.json({ success: true, message: "Email verified!", token, user });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── POST /api/auth/resend-otp ───────────────────────────────────────────────
router.post("/resend-otp", async (req, res) => {
  try {
    const { email, purpose = "verify" } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    // Invalidate old OTPs
    await OTP.updateMany({ email, purpose, used: false }, { used: true });

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.create({ email, otpHash, purpose, expiresAt });
    await sendOTPEmail(email, otp, purpose);

    res.json({ success: true, message: "New OTP sent to your email." });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────
// Step 1: verify credentials → Step 2: send 2FA OTP
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ success: false, message: "Invalid credentials." });

    const match = await user.comparePassword(password);
    if (!match)
      return res.status(401).json({ success: false, message: "Invalid credentials." });

    if (!user.isVerified)
      return res.status(403).json({
        success: false,
        message: "Email not verified.",
        requireVerification: true,
        email,
      });

    // Send 2FA OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.updateMany({ email, purpose: "verify", used: false }, { used: true });
    await OTP.create({ email, otpHash, purpose: "verify", expiresAt });
    await sendOTPEmail(email, otp, "verify");

    res.json({
      success: true,
      message: "Credentials verified. 2FA OTP sent to email.",
      email,
      require2FA: true,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── POST /api/auth/login-verify ─────────────────────────────────────────────
// Step 2 of login: verify 2FA OTP → return JWT
router.post("/login-verify", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await OTP.findOne({
      email,
      purpose: "verify",
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord)
      return res.status(400).json({ success: false, message: "OTP expired or invalid." });

    const valid = await verifyOTP(otp, otpRecord.otpHash);
    if (!valid)
      return res.status(400).json({ success: false, message: "Incorrect OTP." });

    otpRecord.used = true;
    await otpRecord.save();

    const user = await User.findOne({ email }).select("-password -otp");
    const token = signToken(user._id);

    res.json({ success: true, message: "Login successful!", token, user });
  } catch (err) {
    console.error("Login verify error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────
// Sends password-reset OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    // Don't reveal if user exists
    if (!user)
      return res.json({ success: true, message: "If that email exists, an OTP was sent." });

    await OTP.updateMany({ email, purpose: "reset", used: false }, { used: true });

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.create({ email, otpHash, purpose: "reset", expiresAt });
    await sendOTPEmail(email, otp, "reset");

    res.json({ success: true, message: "Password reset OTP sent to email.", email });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── POST /api/auth/reset-password ──────────────────────────────────────────
// Verifies reset OTP + sets new password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 chars." });

    const otpRecord = await OTP.findOne({
      email,
      purpose: "reset",
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpRecord)
      return res.status(400).json({ success: false, message: "OTP expired or invalid." });

    const valid = await verifyOTP(otp, otpRecord.otpHash);
    if (!valid)
      return res.status(400).json({ success: false, message: "Incorrect OTP." });

    otpRecord.used = true;
    await otpRecord.save();

    const user = await User.findOne({ email });
    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    res.json({ success: true, message: "Password reset successful! You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
