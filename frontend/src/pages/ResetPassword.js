import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../utils/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";
  const otp = location.state?.otp || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords do not match.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    setError("");
    setLoading(true);
    try {
      const { data } = await resetPassword({ email, otp, newPassword: password });
      if (data.success) {
        setSuccess(true);
        setTimeout(() => navigate("/login"), 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div className="card fade-up" style={styles.card}>
        <div style={styles.icon}>🔐</div>
        <h1 style={styles.title}>New Password</h1>
        <p style={styles.sub}>Choose a strong password for your account.</p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">✅ Password reset! Redirecting to login…</div>}

        {!success && (
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="label">New Password</label>
              <input className="input" type="password" placeholder="Min. 6 characters"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="label">Confirm Password</label>
              <input className="input" type="password" placeholder="Repeat password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 420, textAlign: "center" },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
  sub: { color: "var(--muted)", marginBottom: 28, fontSize: 14 },
};
