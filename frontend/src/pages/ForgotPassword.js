import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../utils/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await forgotPassword({ email });
      if (data.success) {
        setSent(true);
        setTimeout(() => {
          navigate("/verify-otp", { state: { email, purpose: "reset", isReset: true } });
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Request failed.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div className="card fade-up" style={styles.card}>
        <div style={styles.icon}>🔑</div>
        <h1 style={styles.title}>Forgot Password?</h1>
        <p style={styles.sub}>Enter your email and we'll send a 6-digit OTP to reset your password.</p>

        {error && <div className="alert alert-error">{error}</div>}
        {sent && <div className="alert alert-success">✅ OTP sent! Redirecting…</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading || sent}>
            {loading ? <span className="spinner" /> : "Send Reset OTP"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link to="/login"><button className="btn btn-ghost">← Back to login</button></Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 420, textAlign: "center" },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
  sub: { color: "var(--muted)", marginBottom: 28, fontSize: 14, lineHeight: 1.6 },
};
