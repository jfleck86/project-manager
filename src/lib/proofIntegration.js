// ============================================================
// proofIntegration.js — PulseX ↔ Proof Queue bridge
// Handles task→proof linking, completion sync, notifications.
// Uses same VITE_ env vars as the rest of the app.
// ============================================================

const BASE = () => (typeof window !== "undefined" && window.__SB_URL__) || import.meta.env.VITE_SUPABASE_URL || "";
const KEY  = () => (typeof window !== "undefined" && window.__SB_KEY__)  || import.meta.env.VITE_SUPABASE_ANON_KEY || "";

function headers(token) {
  return {
    "Content-Type": "application/json",
    "apikey": KEY(),
    "Authorization": `Bearer ${token || KEY()}`,
  };
}

// ── Find an existing proof request linked to a PulseX task ───

export async function findLinkedProofRequest(taskId) {
  if (!taskId || !BASE()) return null;
  try {
    const res = await fetch(
      `${BASE()}/rest/v1/proof_requests?related_task_id=eq.${taskId}&is_archived=eq.false&limit=1`,
      { headers: headers(null) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0] || null;
  } catch { return null; }
}

// ── Mark a PulseX task/subtask as Done ───────────────────────

export async function markPulseXTaskDone(taskId, accessToken) {
  if (!taskId || !BASE()) return { error: "Not configured" };
  const hdrs = { ...headers(accessToken), "Prefer": "return=minimal" };
  const body  = JSON.stringify({ status: "Done" });

  // Try subtasks first, then deliverables
  for (const table of ["subtasks", "deliverables"]) {
    try {
      const res = await fetch(`${BASE()}/rest/v1/${table}?id=eq.${taskId}`, {
        method: "PATCH", headers: hdrs, body,
      });
      if (res.ok) return { error: null, table };
    } catch {}
  }
  return { error: "Task not found in subtasks or deliverables" };
}

// ── Create a proof-complete notification in PulseX ───────────

export async function createProofCompletionNotification({
  taskId, taskTitle, projectName, recipientMemberId, proofRequestId, accessToken,
}) {
  if (!BASE() || !recipientMemberId) return;

  // Use the stored user JWT so the insert passes RLS on task_notifications.
  // Falls back to anon key if no session found.
  const token = (() => {
    try {
      const s = JSON.parse((() => { try { return localStorage.getItem("sb_session"); } catch(e) { return null; } })() || "null");
      return s?.access_token || KEY();
    } catch { return KEY(); }
  })();

  const hdrs = { "Content-Type": "application/json", apikey: KEY(), Authorization: `Bearer ${token}`, Prefer: "return=minimal" };
  const msg  = `Proofing is complete for "${taskTitle || "Proof Request"}" on "${projectName || ""}".`;
  const url  = `${BASE()}/rest/v1/task_notifications`;

  // Attempt 1: full notification with all fields (requires proof_queue_integration.sql for extra columns)
  // id format matches PulseX's own notification creation (text primary key, not uuid)
  const notifId = `notif_proof_${Date.now()}_${recipientMemberId}`;

  const fullNotif = {
    id:                       notifId,
    task_id:                  taskId    || null,
    notification_type:        "proof_complete",
    message:                  msg,
    assigned_to_person_id:    recipientMemberId,
    related_proof_request_id: proofRequestId || null,
    link_type:                "proof_request",
    is_read:                  false,
    created_at:               new Date().toISOString(),
  };

  try {
    let res = await fetch(url, { method: "POST", headers: hdrs, body: JSON.stringify(fullNotif) });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("[ProofIntegration] Full notification failed:", res.status, errText.slice(0, 300));

      // Retry with minimal fields — safe for any table schema
      const minimalNotif = {
        id:                    notifId,
        task_id:               taskId || null,
        notification_type:     "task_completed",
        message:               msg,
        assigned_to_person_id: recipientMemberId,
        is_read:               false,
        created_at:            new Date().toISOString(),
      };
      res = await fetch(url, { method: "POST", headers: hdrs, body: JSON.stringify(minimalNotif) });

      if (!res.ok) {
        const err2 = await res.text().catch(() => "");
        console.error("[ProofIntegration] Notification failed:", res.status, err2.slice(0, 300));
        console.error("[ProofIntegration] → Check task_notifications RLS + schema");
        return;
      }
    }

    console.log("[ProofIntegration] ✓ Notification sent, id:", notifId, "→ member:", recipientMemberId);
  } catch (e) {
    console.error("[ProofIntegration] notification threw:", e.message);
  }
}

// ── Find proofreaders scoped to the account director's business unit ────
// Matches the proof request's client name against business_unit_clients,
// then returns person_ids of members in that scope whose team_members.role
// is "proofreading" (the access-level role set in Business Units → All
// people, not a separate discipline tag). Returns [] if no client match or
// no one in that scope has the proofreading role yet — callers should fall
// back to findAllProofreadersByRole() in that case.

export async function findScopedProofreaders(clientName) {
  if (!BASE() || !clientName) return [];
  const hdrs = { apikey: KEY(), Authorization: `Bearer ${KEY()}` };
  try {
    const clientRes = await fetch(
      `${BASE()}/rest/v1/business_unit_clients?client_name=eq.${encodeURIComponent(clientName)}&select=business_unit_id&limit=1`,
      { headers: hdrs }
    );
    if (!clientRes.ok) return [];
    const clientRows = await clientRes.json();
    const businessUnitId = clientRows?.[0]?.business_unit_id;
    if (!businessUnitId) return [];

    const memberRes = await fetch(
      `${BASE()}/rest/v1/business_unit_members?business_unit_id=eq.${businessUnitId}&select=person_id`,
      { headers: hdrs }
    );
    if (!memberRes.ok) return [];
    const memberRows = await memberRes.json();
    const scopeMemberIds = (memberRows || []).map(r => r.person_id).filter(Boolean);
    if (!scopeMemberIds.length) return [];

    const idList = scopeMemberIds.map(id => `"${id}"`).join(",");
    const roleRes = await fetch(
      `${BASE()}/rest/v1/team_members?id=in.(${idList})&role=eq.proofreading&select=id`,
      { headers: hdrs }
    );
    if (!roleRes.ok) return [];
    const roleRows = await roleRes.json();
    return (roleRows || []).map(r => r.id).filter(Boolean);
  } catch (e) {
    console.warn("[ProofIntegration] findScopedProofreaders failed:", e.message);
    return [];
  }
}

// ── Global fallback: everyone with role = "proofreading", regardless of
// business unit. Used when a proof request's client doesn't match any
// configured scope, or no one in that scope has the proofreading role yet.

export async function findAllProofreadersByRole() {
  if (!BASE()) return [];
  const hdrs = { apikey: KEY(), Authorization: `Bearer ${KEY()}` };
  try {
    const res = await fetch(
      `${BASE()}/rest/v1/team_members?role=eq.proofreading&select=id`,
      { headers: hdrs }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return (rows || []).map(r => r.id).filter(Boolean);
  } catch (e) {
    console.warn("[ProofIntegration] findAllProofreadersByRole failed:", e.message);
    return [];
  }
}

// ── Notify all proofreaders when a new request enters the queue ──────────
// Sends one task_notifications row per proofreader. Uses notification_type
// "proof_new_request" — make sure the SQL CHECK constraint on task_notifications
// allows this value (see proof_queue setup SQL), otherwise the insert fails
// and proofreaders simply won't be notified (no silent type-swap fallback,
// since that previously caused the wrong action button to render in PulseX).

export async function notifyNewProofRequest({
  proofreaderMemberIds = [], client, projectName, submittedBy, proofRequestId,
}) {
  if (!BASE() || !proofreaderMemberIds.length) return;

  const token = (() => {
    try {
      const s = JSON.parse((() => { try { return localStorage.getItem("sb_session"); } catch(e) { return null; } })() || "null");
      return s?.access_token || KEY();
    } catch { return KEY(); }
  })();

  const hdrs = { "Content-Type": "application/json", apikey: KEY(), Authorization: `Bearer ${token}`, Prefer: "return=minimal" };
  const url  = `${BASE()}/rest/v1/task_notifications`;
  const msg  = `New proof request from ${submittedBy || "a team member"}: "${projectName || "Untitled"}"${client ? ` (${client})` : ""}.`;

  await Promise.all(proofreaderMemberIds.map(async (memberId) => {
    const notifId = `notif_proofnew_${Date.now()}_${memberId}`;
    const notif = {
      id: notifId,
      notification_type: "proof_new_request",
      message: msg,
      assigned_to_person_id: memberId,
      related_proof_request_id: proofRequestId || null,
      link_type: "proof_request",
      is_read: false,
      created_at: new Date().toISOString(),
    };
    try {
      const res = await fetch(url, { method: "POST", headers: hdrs, body: JSON.stringify(notif) });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn("[ProofIntegration] New-request notification failed for", memberId, ":", res.status, errText.slice(0, 300));
      } else {
        console.log("[ProofIntegration] ✓ New-request notification sent → member:", memberId);
      }
    } catch (e) {
      console.error("[ProofIntegration] new-request notification threw:", e.message);
    }
  }));
}

// ── Build pre-fill object from PulseX task context ────────────

export function buildPrefill({ project, deliverable, task, currentUserName, currentMemberId }) {
  const item = task || deliverable || {};
  return {
    client:                 project?.client || "",
    project_name:           project?.name   || "",
    project_number:         project?.projectNumber || "",
    task_number:            item?.id || "",
    request_type:           "Full Read",
    priority:               item?.priority || "Medium",
    department:             item?.department || "",
    due_date:               item?.end || "",
    sharepoint_link:        item?.fileUrl || item?.sharepoint_link || "",
    instructions:           item?.notes || item?.instructions || "",
    comments:               "",
    submitted_by:           currentUserName || "",
    assigned_proofreader:   null,
    status:                 "Submitted",
    // PulseX linking fields
    related_project_id:     project?.id    || null,
    related_deliverable_id: deliverable?.id || null,
    related_task_id:        task?.id || deliverable?.id || null,
    submitted_by_member_id: currentMemberId || null,
  };
}

// ── localStorage bridge (PulseX → Proof Queue, works across tabs) ──────────
// sessionStorage is per-tab — a new tab cannot read it.
// localStorage persists across tabs; we clear after first read + timestamp check.
const PREFILL_KEY = "proof_queue_prefill";

export function storePrefill(data) {
  try { localStorage.setItem(PREFILL_KEY, JSON.stringify({ ...data, _ts: Date.now() })); } catch {}
}
export function readAndClearPrefill() {
  try {
    const raw = (() => { try { return localStorage.getItem(PREFILL_KEY); } catch(e) { return null; } })()
    if (!raw) return null;
    try { localStorage.removeItem(PREFILL_KEY); } catch(e) {}
    const parsed = JSON.parse(raw);
    if (parsed._ts && Date.now() - parsed._ts > 120000) return null; // stale
    delete parsed._ts;
    return parsed;
  } catch { return null; }
}