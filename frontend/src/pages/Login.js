import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../utils/api";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await loginUser(form);
      const emailNorm = String(form.email || "").trim().toLowerCase();
      if (data.success && data.require2FA) {
        navigate("/verify-otp", { state: { email: emailNorm, purpose: "login" } });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed.";
      const reqVerify = err.response?.data?.requireVerification;
      if (reqVerify) {
        navigate("/verify-otp", {
          state: { email: String(form.email || "").trim().toLowerCase(), purpose: "verify" },
        });
      } else {
        setError(msg);
      }
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div className="card fade-up" style={styles.card}>
        <div style={styles.logo}>⛅</div>
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.sub}>Sign in — 2FA code will be sent to your email</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="label">Email</label>
            <input className="input" name="email" type="email" placeholder="you@example.com"
              value={form.email} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input className="input" name="password" type="password" placeholder="Your password"
              value={form.password} onChange={handle} required />
          </div>

          <div style={{ textAlign: "right", marginBottom: 20 }}>
            <Link to="/forgot-password" style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>
              Forgot password?
            </Link>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Sign In →"}
          </button>
        </form>

        <div className="divider">new here?</div>
        <div style={{ textAlign: "center" }}>
          <Link to="/register"><button className="btn btn-ghost">Create an account</button></Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  card: { width: "100%", maxWidth: 420 },
  logo: { fontSize: 48, textAlign: "center", marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 8 },
  sub: { color: "var(--muted)", textAlign: "center", marginBottom: 28, fontSize: 14 },
};
