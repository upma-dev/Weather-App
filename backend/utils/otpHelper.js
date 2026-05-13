const bcrypt = require("bcryptjs");

/** Generate a cryptographically random 6-digit OTP */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // always 6 digits
};

/** Hash the OTP for safe DB storage */
const hashOTP = async (otp) => {
  return bcrypt.hash(otp, 10);
};

/** Verify OTP against its hash */
const verifyOTP = async (otp, hash) => {
  return bcrypt.compare(otp, hash);
};

module.exports = { generateOTP, hashOTP, verifyOTP };
