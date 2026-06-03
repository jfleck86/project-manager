// src/lib/supabaseAuth.js  ─────────────────────────────────────────────────
// Complete auth client for PulseX — handles all auth states:
//   • email + password sign-in
//   • invite acceptance  (type=invite  in URL hash)
//   • password recovery  (type=recovery in URL hash)
//   • session persistence / expiry
//   • sign-out

function getBase() { return (typeof window !== "undefined" && window.__SB_URL__) || ""; }
function getKey()  { return (typeof window !== "undefined" && window.__SB_KEY__)  || ""; }

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    "apikey": getKey(),
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
}

// ── Decode JWT payload (no crypto needed — just base64) ───────────────────
function decodeJWT(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch { return {}; }
}

// ── Persist session ───────────────────────────────────────────────────────
function storeSession(data) {
  try {
    const session = { ...data };
    // Ensure user.id is always set from JWT sub claim
    if (!session.user?.id && session.access_token) {
      const payload = decodeJWT(session.access_token);
      if (payload.sub) session.user = { ...(session.user || {}), id: payload.sub };
    }
    localStorage.setItem("sb_session", JSON.stringify(session));
    return session;
  } catch { return data; }
}

// ── Sign in with email + password ─────────────────────────────────────────
export async function signInWithPassword(email, password) {
  try {
    const res = await fetch(`${getBase()}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.error_description || data.msg || data.error || "Sign in failed";
      return { session: null, user: null, error: friendlyAuthError(msg) };
    }
    const session = storeSession(data);
    return { session, user: session.user, error: null };
  } catch (e) {
    return { session: null, user: null, error: "Could not reach the server. Check your connection." };
  }
}

// ── Exchange token from URL hash (invite / recovery / magic link) ──────────
// Supabase puts  #access_token=...&refresh_token=...&type=invite  in the URL.
// We exchange the token from the hash to get a usable session.
export async function exchangeHashToken() {
  try {
    const hash = window.location.hash.slice(1); // remove leading #
    if (!hash) return null;
    const params = new URLSearchParams(hash);
    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type         = params.get("type"); // "invite" | "recovery" | "signup" | "magiclink"
    const errorDesc    = params.get("error_description");

    if (errorDesc) {
      return {
        session: null, user: null, type,
        error: friendlyAuthError(errorDesc),
      };
    }
    if (!accessToken) return null;

    // For invite/recovery tokens, use the access_token directly to build a session.
    // We then immediately set the session — for invites the user must still set a password.
    const payload = decodeJWT(accessToken);
    const session = {
      access_token:  accessToken,
      refresh_token: refreshToken || "",
      expires_at:    payload.exp || (Date.now() / 1000 + 3600),
      token_type:    "bearer",
      user: { id: payload.sub, email: payload.email || "" },
    };
    storeSession(session);

    // Clear the hash so tokens don't persist in browser history
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    return { session, user: session.user, type, error: null };
  } catch (e) {
    return { session: null, user: null, type: null, error: "Invalid or expired link." };
  }
}

// ── Set / update password (used for invite acceptance + password reset) ────
export async function updatePassword(newPassword, accessToken) {
  try {
    const res = await fetch(`${getBase()}/auth/v1/user`, {
      method: "PUT",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: friendlyAuthError(data.error_description || data.msg || data.error || "Update failed") };
    }
    return { error: null, user: data };
  } catch {
    return { error: "Could not update password. Check your connection." };
  }
}

// ── Send password reset email ──────────────────────────────────────────────
export async function sendPasswordReset(email, redirectTo) {
  try {
    const body = { email };
    if (redirectTo) body.redirect_to = redirectTo;
    const res = await fetch(`${getBase()}/auth/v1/recover`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    // 200 or 429 (rate limit)
    if (res.status === 429) {
      return { error: "Too many reset attempts. Please wait a few minutes and try again." };
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: friendlyAuthError(data.error_description || data.msg || "Reset failed") };
    }
    return { error: null };
  } catch {
    return { error: "Could not send reset email. Check your connection." };
  }
}

// ── Sign out ──────────────────────────────────────────────────────────────
export async function signOut(accessToken) {
  try { localStorage.removeItem("sb_session"); } catch {}
  if (accessToken) {
    try {
      await fetch(`${getBase()}/auth/v1/logout`, {
        method: "POST",
        headers: authHeaders(accessToken),
      });
    } catch {}
  }
}

// ── Restore session from localStorage ─────────────────────────────────────
export function getStoredSession() {
  try {
    const raw = localStorage.getItem("sb_session");
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.expires_at && Date.now() / 1000 > session.expires_at) {
      localStorage.removeItem("sb_session");
      return null;
    }
    return session;
  } catch { return null; }
}

// ── Fetch app_users row ────────────────────────────────────────────────────
export async function fetchAppUser(authUserId, accessToken) {
  try {
    const res = await fetch(
      `${getBase()}/rest/v1/app_users?id=eq.${authUserId}&select=team_member_id,role&limit=1`,
      { headers: authHeaders(accessToken) }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows?.length) return null;
    return { teamMemberId: rows[0].team_member_id, role: rows[0].role || "member" };
  } catch { return null; }
}

// ── Friendly error messages ────────────────────────────────────────────────
export function friendlyAuthError(raw) {
  if (!raw) return "An unexpected error occurred.";
  const r = raw.toLowerCase();
  if (r.includes("invalid login") || r.includes("invalid credentials") || r.includes("wrong password"))
    return "Incorrect email or password. Please try again.";
  if (r.includes("email not confirmed"))
    return "Your email address has not been confirmed. Check your inbox for a confirmation email.";
  if (r.includes("user not found"))
    return "No account found with that email address.";
  if (r.includes("token has expired") || r.includes("jwt expired") || r.includes("invalid token"))
    return "This link has expired. Please request a new one.";
  if (r.includes("email link is invalid") || r.includes("403"))
    return "This invitation link is invalid or has already been used. Please request a new invitation.";
  if (r.includes("rate limit") || r.includes("429") || r.includes("too many"))
    return "Too many attempts. Please wait a few minutes before trying again.";
  if (r.includes("network") || r.includes("failed to fetch"))
    return "Could not connect. Check your internet connection.";
  if (r.includes("password should be at least"))
    return "Password must be at least 6 characters.";
  return raw;
}