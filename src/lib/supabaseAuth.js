// src/lib/supabaseAuth.js
// ── Supabase Auth client ──────────────────────────────────────────────────────
// Uses the Supabase JS SDK (v2) auth API via fetch — no npm package needed.
// We implement just the auth endpoints we need directly against the REST API.

function getBase() {
  return (typeof window !== "undefined" && window.__SB_URL__) || "";
}
function getKey() {
  return (typeof window !== "undefined" && window.__SB_KEY__) || "";
}

// ── Sign in with email + password ─────────────────────────────────────────────
export async function signInWithPassword(email, password) {
  const res = await fetch(`${getBase()}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": getKey(),
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) return { session: null, user: null, error: data.error_description || data.msg || "Login failed" };

  // Persist session — also decode JWT to ensure user.id is always available
  try {
    const session = { ...data };
    if (!session.user?.id && session.access_token) {
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
        if (payload.sub) session.user = { ...(session.user || {}), id: payload.sub };
      } catch {}
    }
    localStorage.setItem("sb_session", JSON.stringify(session));
  } catch {}

  return { session: data, user: data.user, error: null };
}

// ── Sign out ──────────────────────────────────────────────────────────────────
// Always clears local session first. Supabase logout is best-effort —
// a 401 (expired/invalid token) is normal and does not block sign-out.
export async function signOut(accessToken) {
  // 1. Clear local state immediately — this is what actually logs the user out
  try { localStorage.removeItem("sb_session"); } catch {}

  // 2. Attempt server-side token revocation, but never block on it
  if (accessToken) {
    try {
      await fetch(`${getBase()}/auth/v1/logout`, {
        method: "POST",
        headers: { "apikey": getKey(), "Authorization": `Bearer ${accessToken}` },
      });
      // 401 = token already expired/invalid — perfectly fine, local logout already done
    } catch {
      // Network error — also fine, local logout already done
    }
  }
}

// ── Restore session from localStorage ─────────────────────────────────────────
export function getStoredSession() {
  try {
    const raw = localStorage.getItem("sb_session");
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Check expiry (expires_at is a unix timestamp in seconds)
    if (session.expires_at && Date.now() / 1000 > session.expires_at) {
      localStorage.removeItem("sb_session");
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// ── Fetch the app_users row for the logged-in auth user ───────────────────────
// Returns { teamMemberId, role } or null
export async function fetchAppUser(authUserId, accessToken) {
  const res = await fetch(
    `${getBase()}/rest/v1/app_users?id=eq.${authUserId}&select=team_member_id,role&limit=1`,
    {
      headers: {
        "apikey": getKey(),
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows?.length) return null;
  return { teamMemberId: rows[0].team_member_id, role: rows[0].role || "member" };
}