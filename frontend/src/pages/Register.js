import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../utils/api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await registerUser(form);
      if (data.success) {
        navigate("/verify-otp", { state: { email: form.email, purpose: "verify" } });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div className="card fade-up" style={styles.card}>
        <div style={styles.logo}>⛅</div>
        <h1 style={styles.title}>Create account</h1>
        <p style={styles.sub}>Join WeatherApp — get real-time weather data</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="label">Full Name</label>
            <input className="input" name="name" placeholder="John Doe"
              value={form.name} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input className="input" name="email" type="email" placeholder="you@example.com"
              value={form.email} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input className="input" name="password" type="password" placeholder="Min. 6 characters"
              value={form.password} onChange={handle} required minLength={6} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Create Account"}
          </button>
        </form>

        <div className="divider">already have an account?</div>
        <div style={{ textAlign: "center" }}>
          <Link to="/login"><button className="btn btn-ghost">Sign in instead</button></Link>
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
