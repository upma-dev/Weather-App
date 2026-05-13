const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com", // ← Gmail ki jagah Brevo
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: String(process.env.EMAIL_PASS || "").replace(/\s/g, ""),
  },
});
/**
 * Send a 6-digit OTP email
 * @param {string} to  - recipient email
 * @param {string} otp - plaintext 6-digit OTP
 * @param {"verify"|"reset"} purpose
 */
const sendOTPEmail = async (to, otp, purpose = "verify") => {
  const subject =
    purpose === "verify"
      ? "🔐 Verify your WeatherApp account"
      : "🔑 Reset your WeatherApp password";

  const actionText =
    purpose === "verify"
      ? "Please use the OTP below to verify your email address."
      : "Use the OTP below to reset your password.";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
        .container { max-width: 480px; margin: 40px auto; background: #1e293b; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #3b82f6, #06b6d4); padding: 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; color: #fff; letter-spacing: 2px; }
        .body { padding: 32px; }
        .otp-box { background: #0f172a; border: 2px solid #3b82f6; border-radius: 12px;
                   text-align: center; padding: 24px; margin: 24px 0; }
        .otp-code { font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #38bdf8;
                    font-family: 'Courier New', monospace; }
        .note { font-size: 13px; color: #94a3b8; margin-top: 8px; }
        .footer { padding: 20px 32px; background: #0f172a; font-size: 12px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⛅ WeatherApp</h1>
        </div>
        <div class="body">
          <p style="font-size:16px;">${actionText}</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="note">This OTP expires in <strong>10 minutes</strong></div>
          </div>
          <p style="color:#94a3b8;font-size:13px;">
            If you did not request this, please ignore this email.
            Your account is safe.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} WeatherApp &mdash; Built for interview demo
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"WeatherApp" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = { sendOTPEmail };
