// src/components/LoginScreen.jsx
import React, { useState } from "react";
import { signInWithPassword } from "../lib/supabaseAuth.js";

export default function LoginScreen({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { session, user, error: err } = await signInWithPassword(email, password);
    setLoading(false);
    if (err) { setError(err); return; }
    onLogin({ session, user });
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#002A4E",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: '"Roboto", Arial, sans-serif',
    }}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: "40px 44px",
        width: "100%", maxWidth: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, background: "#50C0C0", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#002A4E" }}>PX</span>
          </div>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#002A4E" }}>PulseX</span>
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>Sign in</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 24 }}>
          Use your team email and password
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5 }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@company.com"
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 7, fontSize: 13,
                border: "1px solid rgba(0,0,0,0.15)", outline: "none",
                fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5 }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 7, fontSize: 13,
                border: "1px solid rgba(0,0,0,0.15)", outline: "none",
                fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.08)",
              borderRadius: 6, padding: "8px 12px", marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "10px", borderRadius: 7, border: "none",
              background: loading ? "#9ca3af" : "#50C0C0", color: "#002A4E",
              fontSize: 13, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit", letterSpacing: "0.04em",
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
