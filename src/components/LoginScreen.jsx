// src/components/LoginScreen.jsx
// Handles all pre-auth states:
//   • Sign in  (default)
//   • Forgot password  (request reset email)
//   • Set password  (invite acceptance OR password reset, triggered by URL hash)
//   • Session expired notice

import React, { useState, useEffect } from "react";
import {
  signInWithPassword,
  sendPasswordReset,
  updatePassword,
  exchangeHashToken,
  friendlyAuthError,
} from "../lib/supabaseAuth.js";

const BRAND_TEAL = "#50C0C0";
const BRAND_NAVY = "#002A4E";

// ── Password strength helper ───────────────────────────────────────────────
function getStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "#e5e7eb" };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Too short",  color: "#ef4444" };
  if (score === 2) return { score, label: "Weak",       color: "#f97316" };
  if (score === 3) return { score, label: "Fair",       color: "#fbbf24" };
  if (score === 4) return { score, label: "Good",       color: BRAND_TEAL };
  return              { score, label: "Strong",     color: "#34d399" };
}

// ── Shared styles ──────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 7, fontSize: 13,
  border: "1px solid rgba(0,0,0,0.15)", outline: "none",
  fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.15s",
};
const labelStyle = {
  fontSize: 11, fontWeight: 700, color: "#374151",
  display: "block", marginBottom: 5, letterSpacing: "0.05em",
};
const errorBoxStyle = {
  fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.08)",
  borderRadius: 6, padding: "9px 12px", marginBottom: 16, lineHeight: 1.5,
};
const infoBoxStyle = {
  fontSize: 12, color: "#0369a1", background: "rgba(3,105,161,0.07)",
  borderRadius: 6, padding: "9px 12px", marginBottom: 16, lineHeight: 1.5,
};
const successBoxStyle = {
  fontSize: 12, color: "#059669", background: "rgba(5,150,105,0.08)",
  borderRadius: 6, padding: "9px 12px", marginBottom: 16, lineHeight: 1.5,
};

function PrimaryButton({ children, loading, disabled, onClick, type = "submit" }) {
  return (
    <button type={type} disabled={loading || disabled} onClick={onClick}
      style={{
        width: "100%", padding: "11px", borderRadius: 7, border: "none",
        background: (loading || disabled) ? "#9ca3af" : BRAND_TEAL,
        color: BRAND_NAVY, fontSize: 13, fontWeight: 800,
        cursor: (loading || disabled) ? "not-allowed" : "pointer",
        fontFamily: "inherit", letterSpacing: "0.04em", transition: "background 0.15s",
      }}>
      {loading ? "Please wait…" : children}
    </button>
  );
}

function BackLink({ onClick, label = "← Back to sign in" }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: "none", border: "none", color: BRAND_TEAL, fontSize: 12,
        fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 16,
        display: "block", textAlign: "center", width: "100%", padding: 0 }}>
      {label}
    </button>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
      <div style={{ width: 36, height: 36, background: BRAND_TEAL, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: BRAND_NAVY }}>PX</span>
      </div>
      <span style={{ fontSize: 20, fontWeight: 900, color: BRAND_NAVY }}>PulseX</span>
    </div>
  );
}

// ── View: Sign In ──────────────────────────────────────────────────────────
function SignInView({ onLogin, onForgotPassword, sessionExpired }) {
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
    <>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>Sign in</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 24 }}>Use your team email and password</div>

      {sessionExpired && (
        <div style={infoBoxStyle}>Your session has expired. Please sign in again.</div>
      )}
      {error && <div style={errorBoxStyle}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>EMAIL</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            required autoFocus placeholder="you@company.com" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>PASSWORD</label>
            <button type="button" onClick={onForgotPassword}
              style={{ background: "none", border: "none", color: BRAND_TEAL, fontSize: 11,
                fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
              Forgot password?
            </button>
          </div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            required placeholder="••••••••" style={inputStyle} />
        </div>
        <PrimaryButton loading={loading}>Sign In</PrimaryButton>
      </form>
    </>
  );
}

// ── View: Forgot Password ─────────────────────────────────────────────────
function ForgotPasswordView({ onBack }) {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const redirectTo = typeof window !== "undefined"
    ? window.location.origin + window.location.pathname
    : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await sendPasswordReset(email, redirectTo);
    setLoading(false);
    if (err) { setError(err); return; }
    setSent(true);
  };

  if (sent) return (
    <>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>Check your email</div>
      <div style={successBoxStyle}>
        A password reset link has been sent to <strong>{email}</strong>.
        Check your inbox — the link is valid for 1 hour.
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 20, lineHeight: 1.6 }}>
        Didn't receive it? Check your spam folder, or{" "}
        <button type="button" onClick={() => setSent(false)}
          style={{ background: "none", border: "none", color: BRAND_TEAL, fontSize: 12,
            fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
          try again
        </button>.
      </div>
      <BackLink onClick={onBack} />
    </>
  );

  return (
    <>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>Reset your password</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 24 }}>
        Enter your email and we'll send a reset link.
      </div>
      {error && <div style={errorBoxStyle}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>EMAIL</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            required autoFocus placeholder="you@company.com" style={inputStyle} />
        </div>
        <PrimaryButton loading={loading}>Send Reset Link</PrimaryButton>
      </form>
      <BackLink onClick={onBack} />
    </>
  );
}

// ── View: Set Password (invite acceptance OR recovery) ─────────────────────
function SetPasswordView({ session, type, onLogin, onBack }) {
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);

  const isInvite = type === "invite" || type === "signup";
  const strength = getStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const { error: err } = await updatePassword(password, session?.access_token);
    setLoading(false);
    if (err) { setError(err); return; }
    setSuccess(true);
    // Auto-redirect into the app after 1.5s
    setTimeout(() => onLogin({ session, user: session.user }), 1500);
  };

  if (success) return (
    <>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>
        {isInvite ? "Welcome to PulseX!" : "Password updated"}
      </div>
      <div style={successBoxStyle}>
        {isInvite
          ? "Your account is set up. Taking you in now…"
          : "Your password has been updated. Signing you in…"}
      </div>
    </>
  );

  return (
    <>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>
        {isInvite ? "Create your password" : "Set a new password"}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 24 }}>
        {isInvite
          ? "Choose a password to complete your account setup."
          : "Enter a new password for your account."}
      </div>
      {error && <div style={errorBoxStyle}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            {isInvite ? "CREATE PASSWORD" : "NEW PASSWORD"}
          </label>
          <input type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            required autoFocus placeholder="At least 6 characters" style={inputStyle} />
          {/* Strength meter */}
          {password.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2,
                    background: i <= strength.score ? strength.color : "#e5e7eb",
                    transition: "background 0.2s" }} />
                ))}
              </div>
              <div style={{ fontSize: 10, color: strength.color, fontWeight: 600 }}>
                {strength.label}
                {strength.score < 3 && " — try adding numbers or symbols"}
              </div>
            </div>
          )}
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>CONFIRM PASSWORD</label>
          <input type="password" value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required placeholder="Repeat your password"
            style={{
              ...inputStyle,
              borderColor: confirm && confirm !== password ? "#f87171" : "rgba(0,0,0,0.15)",
            }} />
          {confirm && confirm !== password && (
            <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>Passwords do not match</div>
          )}
        </div>
        <PrimaryButton loading={loading} disabled={!password || !confirm || password !== confirm}>
          {isInvite ? "Create Account" : "Update Password"}
        </PrimaryButton>
      </form>
      {!isInvite && <BackLink onClick={onBack} />}
    </>
  );
}

// ── View: Expired / invalid link ──────────────────────────────────────────
function ExpiredLinkView({ message, type, onBack }) {
  const isInvite = type === "invite";
  return (
    <>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#1f2937", marginBottom: 12 }}>
        {isInvite ? "Invitation expired" : "Link expired"}
      </div>
      <div style={errorBoxStyle}>{message}</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 20, lineHeight: 1.6 }}>
        {isInvite
          ? "Ask your administrator to send a new invitation."
          : "Use the Forgot Password link below to request a new reset email."}
      </div>
      <BackLink onClick={onBack}
        label={isInvite ? "← Back to sign in" : "← Back to sign in"} />
    </>
  );
}

// ── Root LoginScreen component ─────────────────────────────────────────────
export default function LoginScreen({ onLogin, sessionExpired = false }) {
  // view: "signin" | "forgot" | "setpassword" | "expired"
  const [view,          setView]          = useState("signin");
  const [hashSession,   setHashSession]   = useState(null);
  const [hashType,      setHashType]      = useState(null);
  const [linkError,     setLinkError]     = useState("");
  const [checkingHash,  setCheckingHash]  = useState(true);

  // On mount, check for Supabase tokens in the URL hash
  useEffect(() => {
    async function check() {
      const result = await exchangeHashToken();
      if (!result) { setCheckingHash(false); return; }

      if (result.error) {
        setLinkError(result.error);
        setHashType(result.type);
        setView("expired");
        setCheckingHash(false);
        return;
      }
      // We have a valid token — show the set-password screen
      setHashSession(result.session);
      setHashType(result.type);
      setView("setpassword");
      setCheckingHash(false);
    }
    check();
  }, []);

  if (checkingHash) {
    // Brief loading state while we check the URL hash
    return (
      <div style={{ minHeight: "100vh", background: BRAND_NAVY,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: BRAND_NAVY,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: '"Roboto", Arial, sans-serif', padding: "24px 16px",
    }}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: "36px 40px",
        width: "100%", maxWidth: 380,
        boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
      }}>
        <Logo />

        {view === "signin" && (
          <SignInView
            onLogin={onLogin}
            onForgotPassword={() => setView("forgot")}
            sessionExpired={sessionExpired}
          />
        )}

        {view === "forgot" && (
          <ForgotPasswordView onBack={() => setView("signin")} />
        )}

        {view === "setpassword" && (
          <SetPasswordView
            session={hashSession}
            type={hashType}
            onLogin={onLogin}
            onBack={() => setView("signin")}
          />
        )}

        {view === "expired" && (
          <ExpiredLinkView
            message={linkError}
            type={hashType}
            onBack={() => setView("signin")}
          />
        )}
      </div>
    </div>
  );
}
