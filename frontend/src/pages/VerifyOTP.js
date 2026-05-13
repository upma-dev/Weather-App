import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyOTP, resendOTP, loginVerify } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const email = location.state?.email || "";
  const purpose = location.state?.purpose || "verify";
  const isReset = location.state?.isReset || false;

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(60);

  const refs = useRef([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleDigit = (idx, val) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = v;
    setDigits(next);
    if (v && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKey = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const next = [...digits];
    pasted.split("").forEach((ch, i) => {
      next[i] = ch;
    });
    setDigits(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const otp = digits.join("");

  const submit = async (e) => {
    e?.preventDefault();
    if (otp.length !== 6) return setError("Enter all 6 digits.");
    setError("");
    setLoading(true);

    try {
      if (isReset) {
        navigate("/reset-password", { state: { email, otp } });
        setLoading(false);
        return;
      }

      let data;
      if (purpose === "login") {
        const res = await loginVerify({ email, otp });
        data = res.data;
      } else {
        const res = await verifyOTP({ email, otp });
        data = res.data;
      }

      if (data.success) {
        login(data.user, data.token);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed.");
    }

    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await resendOTP({ email, purpose: isReset ? "reset" : "verify" });
      setSuccess("New OTP sent!");
      setCountdown(60);
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
    }
    setResending(false);
  };

  return (
    <div style={styles.page}>
      <div className="card fade-up" style={styles.card}>
        <div style={styles.icon}>📬</div>
        <h1 style={styles.title}>
          {isReset
            ? "Reset Password"
            : purpose === "login"
              ? "2FA Verification"
              : "Verify Email"}
        </h1>
        <p style={styles.sub}>
          We sent a 6-digit code to
          <br />
          <strong style={{ color: "var(--accent)" }}>{email}</strong>
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={submit}>
          <div className="otp-grid">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (refs.current[i] = el)}
                className={`otp-input ${d ? "filled" : ""}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKey(i, e)}
                onPaste={handlePaste}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <div style={{ marginTop: 28 }}>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <span className="spinner" />
              ) : isReset ? (
                "Continue to Reset"
              ) : (
                "Verify"
              )}
            </button>
          </div>
        </form>

        <div style={styles.resendRow}>
          {countdown > 0 ? (
            <span style={{ color: "var(--muted)", fontSize: 13 }}>
              Resend in{" "}
              <strong style={{ color: "var(--accent)" }}>{countdown}s</strong>
            </span>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: { width: "100%", maxWidth: 420, textAlign: "center" },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
  sub: {
    color: "var(--muted)",
    marginBottom: 28,
    fontSize: 14,
    lineHeight: 1.6,
  },
  resendRow: { marginTop: 20, textAlign: "center" },
};
