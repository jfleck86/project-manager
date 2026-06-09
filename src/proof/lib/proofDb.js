// @ts-nocheck
// ============================================================
// proofDb.js — Proof Queue Supabase operations
// Uses raw fetch + anon key for reads (same as supabaseRest.js in main app).
// Uses user JWT for writes so RLS on proof_requests is satisfied.
// ============================================================

const SB_URL = () => (typeof window !== "undefined" && window.__SB_URL__) || import.meta.env.VITE_SUPABASE_URL  || "";
const SB_KEY = () => (typeof window !== "undefined" && window.__SB_KEY__) || import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const DB_READY = typeof window !== "undefined"
  ? !!(window.__SB_URL__ || import.meta.env.VITE_SUPABASE_URL)
  : false;

// Auth headers — anon key for reads, user JWT for writes
function readHeaders()  {
  const key = SB_KEY();
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}
function writeHeaders() {
  const key = SB_KEY();
  let token = key; // default to anon
  try {
    const raw = localStorage.getItem("sb_session");
    if (raw) {
      const s = JSON.parse(raw);
      if (s?.access_token) token = s.access_token;
    }
  } catch {}
  return { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" };
}

// ── Current user ──────────────────────────────────────────────
export function getProofCurrentUser() {
  try {
    const id   = localStorage.getItem("planr_own_member_id");
    let   name = localStorage.getItem("planr_own_member_name");
    // Look up from cached people list if name is empty
    if (!name && id) {
      const raw = localStorage.getItem("proof_queue_people");
      if (raw) {
        const people = JSON.parse(raw);
        const me = people?.find(p => p.id === id);
        if (me?.name) { name = me.name; try { localStorage.setItem("planr_own_member_name", name); } catch {} }
      }
    }
    if (id) return { name: name || null, id };
    return null;
  } catch { return null; }
}

// Fetch the current user's name directly from team_members by their member ID
export async function fetchMemberName(memberId) {
  if (!memberId || !DB_READY) return null;
  try {
    const res  = await fetch(`${SB_URL()}/rest/v1/team_members?id=eq.${memberId}&select=id,name&limit=1`, { headers: readHeaders() });
    const rows = await res.json();
    const name = Array.isArray(rows) && rows[0]?.name ? rows[0].name : null;
    if (name) try { localStorage.setItem("planr_own_member_name", name); } catch {}
    return name;
  } catch { return null; }
}


// ── Row mapper ────────────────────────────────────────────────
function rowToRequest(row) {
  if (!row) return null;
  return {
    id:                      row.id,
    client:                  row.client                  || "",
    project_name:            row.project_name            || "",
    project_number:          row.project_number          || "",
    task_number:             row.task_number             || "",
    request_type:            row.request_type            || "Full Read",
    priority:                row.priority                || "Medium",
    department:              row.department              || "",
    due_date:                row.due_date                || null,
    sharepoint_link:         row.sharepoint_link         || "",
    instructions:            row.instructions            || "",
    comments:                row.comments                || "",
    submitted_by:            row.submitted_by            || "",
    assigned_proofreader:    row.assigned_proofreader    || null,
    assigned_proofreader_id: row.assigned_proofreader_id || null,
    assigned_member_id:      row.assigned_member_id      || null,
    status:                  row.status                  || "Submitted",
    created_at:              row.created_at              || null,
    updated_at:              row.updated_at              || null,
    completed_at:            row.completed_at            || null,
    created_by:              row.created_by              || null,
    updated_by:              row.updated_by              || null,
    status_changed_by:       row.status_changed_by       || null,
    assigned_by:             row.assigned_by             || null,
    related_project_id:      row.related_project_id      || null,
    related_deliverable_id:  row.related_deliverable_id  || null,
    related_task_id:         row.related_task_id         || null,
    submitted_by_member_id:  row.submitted_by_member_id  || null,
    is_archived:             row.is_archived             || false,
    archived_at:             row.archived_at             || null,
    archived_by:             row.archived_by             || null,
  };
}

// ── Field sanitization ────────────────────────────────────────
const DATE_COLS = ["due_date", "completed_at", "archived_at"];
const UUID_COLS = ["assigned_proofreader_id", "assigned_member_id", "related_project_id", "related_deliverable_id", "related_task_id"];
const UUID_RE   = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE_COLS = [
  "id","client","project_name","project_number","task_number","request_type","priority",
  "department","due_date","sharepoint_link","instructions","comments","submitted_by",
  "assigned_proofreader","assigned_proofreader_id","status","created_at","updated_at",
  "completed_at","created_by","updated_by","status_changed_by","assigned_by",
];

function sanitize(obj) {
  const out = { ...obj };
  DATE_COLS.forEach(f => { if (f in out && !out[f]) out[f] = null; });
  UUID_COLS.forEach(f => { if (f in out && out[f] && !UUID_RE.test(out[f])) { console.warn(`[ProofQueue] nulling non-UUID ${f}:`, out[f]); out[f] = null; } });
  return out;
}
function pickBase(obj) { return Object.fromEntries(BASE_COLS.filter(k => k in obj).map(k => [k, obj[k]])); }

// ── Fetch ─────────────────────────────────────────────────────
export async function fetchRequests() { return fetchRequestsFiltered(true); }

export async function fetchRequestsFiltered(includeArchived = false) {
  if (!DB_READY) return { data: [], error: null };
  try {
    const res  = await fetch(`${SB_URL()}/rest/v1/proof_requests?select=*&order=created_at.desc`, { headers: readHeaders() });
    const data = await res.json();
    if (!res.ok) { console.error("[ProofQueue] fetch error:", data?.message || res.status); return { data: [], error: data }; }
    const rows = (Array.isArray(data) ? data : []).map(rowToRequest);
    console.log(`[ProofQueue] Loaded ${rows.length} proof requests`);
    return { data: includeArchived ? rows : rows.filter(r => !r.is_archived), error: null };
  } catch (e) { console.error("[ProofQueue] fetch threw:", e.message); return { data: [], error: e }; }
}

// ── Save ──────────────────────────────────────────────────────
export async function saveRequest(req) {
  if (!DB_READY) return { data: req, error: null };
  const { id, _isNew, _prefill, ...rawFields } = req;
  const fields = sanitize(rawFields);
  const isInsert = _isNew || !id || String(id).startsWith("pr_") || String(id).startsWith("tmp_");
  const insertId = isInsert
    ? (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    : id;

  const doReq = async (body, method, suffix) => {
    const url  = `${SB_URL()}/rest/v1/proof_requests${suffix}`;
    // Use return=minimal — avoids the SELECT-after-write that can fail with RLS
    const hdrs = { ...writeHeaders(), Prefer: "return=minimal" };
    console.log(`[ProofQueue] ${method}`, url, "columns:", Object.keys(body).join(", "));
    let res = await fetch(url, { method, headers: hdrs, body: JSON.stringify(body) });
    // Retry with anon key if JWT rejected
    if (res.status === 401 || res.status === 403) {
      console.warn(`[ProofQueue] JWT rejected, retrying with anon key`);
      res = await fetch(url, { method, headers: { ...readHeaders(), Prefer: "return=minimal" }, body: JSON.stringify(body) });
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[ProofQueue] ${method} failed ${res.status}:`, errText.slice(0, 400));
      let errObj = {};
      try { errObj = JSON.parse(errText); } catch {}
      return { ok: false, error: errObj, text: errText };
    }
    await res.text().catch(() => {}); // consume minimal body
    return { ok: true, error: null };
  };

  let result = isInsert
    ? await doReq({ ...fields, id: insertId, created_at: fields.created_at || new Date().toISOString() }, "POST", "")
    : await doReq({ ...fields, updated_at: new Date().toISOString() }, "PATCH", `?id=eq.${id}`);

  // Retry with base fields if column-not-found error
  if (!result.ok) {
    const msg = result.text || result.error?.message || "";
    if (msg.includes("column") || msg.includes("does not exist") || msg.includes("42703") || msg.includes("22P02")) {
      console.warn("[ProofQueue] Column error — retrying with base fields. Run proof_columns_only.sql.");
      const safe = pickBase(isInsert
        ? { ...fields, id: insertId, created_at: fields.created_at || new Date().toISOString() }
        : { ...fields, updated_at: new Date().toISOString() }
      );
      result = isInsert
        ? await doReq(safe, "POST", "")
        : await doReq(safe, "PATCH", `?id=eq.${id}`);
    }
  }

  if (!result.ok) {
    console.error("[ProofQueue] Save failed. Check the error above.");
    return { data: req, error: result.error || { message: "Save failed" } };
  }

  // For inserts, build the saved record from what we know (insertId + submitted data)
  const savedData = isInsert
    ? { ...fields, id: insertId, created_at: fields.created_at || new Date().toISOString() }
    : { ...fields, id };
  console.log("[ProofQueue] Saved ✓ id:", savedData.id);
  return { data: rowToRequest(savedData), error: null };
}


// ── Update ────────────────────────────────────────────────────
// Only these fields are guaranteed to exist in the base proof_requests schema
const CORE_COLS = ["assigned_proofreader", "status", "completed_at", "instructions", "comments"];

export async function updateRequest(id, fields) {
  if (!DB_READY) return { error: null };
  const clean = sanitize(fields);
  const url   = `${SB_URL()}/rest/v1/proof_requests?id=eq.${id}`;

  const patch = async (body, label) => {
    // return=minimal avoids Supabase needing SELECT permission after PATCH
    const hdrs = { ...writeHeaders(), Prefer: "return=minimal" };
    let res = await fetch(url, { method: "PATCH", headers: hdrs, body: JSON.stringify(body) });
    if (res.status === 401 || res.status === 403) {
      console.warn(`[ProofQueue] JWT rejected for ${label}, retrying anon`);
      res = await fetch(url, { method: "PATCH", headers: { ...readHeaders(), Prefer: "return=minimal" }, body: JSON.stringify(body) });
    }
    return res;
  };

  try {
    // Attempt 1: all fields
    let res = await patch(clean, "full");
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("[ProofQueue] PATCH failed:", res.status, errText.slice(0, 300));
      // Attempt 2: guaranteed base columns only
      const coreBody = Object.fromEntries(Object.entries(clean).filter(([k]) => CORE_COLS.includes(k)));
      if (Object.keys(coreBody).length > 0) {
        res = await patch(coreBody, "core-only");
        if (!res.ok) {
          const err2 = await res.text().catch(() => "");
          console.error("[ProofQueue] Core PATCH also failed:", res.status, err2.slice(0, 300));
          console.error("[ProofQueue] → Run proof_columns_only.sql in Supabase to fix missing columns");
          return { error: { status: res.status, message: err2 } };
        }
      }
    }
    await res.text().catch(() => {});
    console.log("[ProofQueue] Update saved ✓");
    return { error: null };
  } catch (e) {
    console.error("[ProofQueue] updateRequest threw:", e.message);
    return { error: e };
  }
}


// ── Archive ───────────────────────────────────────────────────
export async function archiveRequest(id, archivedBy) {
  return updateRequest(id, { is_archived: true, archived_at: new Date().toISOString(), archived_by: archivedBy || null });
}
export async function unarchiveRequest(id) {
  return updateRequest(id, { is_archived: false, archived_at: null, archived_by: null });
}

export async function deleteRequest(id) {
  if (!DB_READY) return { error: null };
  try {
    const res = await fetch(`${SB_URL()}/rest/v1/proof_requests?id=eq.${id}`, {
      method: "DELETE",
      headers: { ...writeHeaders(), Prefer: "return=minimal" },
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      if (res.status === 401 || res.status === 403) {
        const res2 = await fetch(`${SB_URL()}/rest/v1/proof_requests?id=eq.${id}`, {
          method: "DELETE", headers: { ...readHeaders(), Prefer: "return=minimal" },
        });
        if (!res2.ok) { const e2 = await res2.text().catch(() => ""); return { error: e2 }; }
        return { error: null };
      }
      return { error: err };
    }
    return { error: null };
  } catch (e) { return { error: e.message }; }
}

// Look up a team member's ID by their name (for completion notifications)
// Uses ilike for case-insensitive match
export async function findMemberIdByName(name) {
  if (!name || !DB_READY) return null;
  try {
    const encoded = encodeURIComponent(name.trim());
    const res  = await fetch(`${SB_URL()}/rest/v1/team_members?name=ilike.${encoded}&select=id&limit=1`, { headers: readHeaders() });
    const rows = await res.json();
    if (Array.isArray(rows) && rows[0]?.id) {
      console.log("[ProofQueue] Found member ID for", name, ":", rows[0].id);
      return rows[0].id;
    }
    console.warn("[ProofQueue] No team member found for name:", name);
    return null;
  } catch (e) {
    console.error("[ProofQueue] findMemberIdByName error:", e.message);
    return null;
  }
}


// ── Find by PulseX task ───────────────────────────────────────
export async function findByTaskId(taskId) {
  if (!DB_READY || !taskId) return { data: null, error: null };
  try {
    const res  = await fetch(`${SB_URL()}/rest/v1/proof_requests?related_task_id=eq.${taskId}&is_archived=eq.false&limit=1`, { headers: readHeaders() });
    const data = await res.json();
    if (!res.ok) return { data: null, error: data };
    return { data: Array.isArray(data) && data.length > 0 ? rowToRequest(data[0]) : null, error: null };
  } catch (e) { return { data: null, error: e }; }
}

// ── Proofreaders ──────────────────────────────────────────────
export async function fetchProofreaders() {
  if (!DB_READY) return { data: [], error: null, source: "offline" };
  const hdrs = readHeaders(); // anon key — same as supabaseRest.js

  // 2. proofreaders table
  try {
    const res = await fetch(`${SB_URL()}/rest/v1/proofreaders?is_active=eq.true&order=name`, { headers: hdrs });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return { data: rows.map(r => ({ id: r.id, name: r.name || "", teamMemberId: r.team_member_id || null })), error: null, source: "proofreaders" };
      }
    }
  } catch {}

  // 3. team_members filtered to Proof/Proofreading department
  console.info("[ProofQueue] Falling back to team_members");
  try {
    // First try: department-filtered (only proofreaders)
    const filteredRes  = await fetch(`${SB_URL()}/rest/v1/team_members?select=id,name,department&or=(department.eq.Proof,department.eq.Proofreading)&order=name`, { headers: hdrs });
    if (filteredRes.ok) {
      const filtered = await filteredRes.json();
      if (Array.isArray(filtered) && filtered.length > 0) {
        console.info(`[ProofQueue] Loaded ${filtered.length} proofreaders from team_members`);
        return { data: filtered.map(r => ({ id: r.id, name: r.name || "", teamMemberId: r.id })), error: null, source: "team_members" };
      }
    }
    // Second try: all team members (no department filter) — only if none found above
    const allRes  = await fetch(`${SB_URL()}/rest/v1/team_members?select=id,name&order=name`, { headers: hdrs });
    const allRows = await allRes.json();
    if (!allRes.ok) { console.error("[ProofQueue] team_members error:", allRows?.message || allRes.status); return { data: [], error: allRows, source: "error" }; }
    if (!allRows?.length) { console.warn("[ProofQueue] No team members found — set Department = Proof in PulseX Team Settings."); return { data: [], error: null, source: "empty" }; }
    console.info(`[ProofQueue] No Proof-dept members found — showing all ${allRows.length} team members`);
    return { data: allRows.map(r => ({ id: r.id, name: r.name || "", teamMemberId: r.id })), error: null, source: "team_members_all" };
  } catch (e) { console.error("[ProofQueue] team_members threw:", e.message); return { data: [], error: e, source: "error" }; }
}