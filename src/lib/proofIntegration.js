// ============================================================
// proofIntegration.js — PulseX ↔ Proof Queue bridge
// Handles task→proof linking, completion sync, notifications.
// Uses same VITE_ env vars as the rest of the app.
// ============================================================

const BASE = () => (typeof window !== "undefined" && window.__SB_URL__) || import.meta.env.VITE_SUPABASE_URL || "";
const KEY  = () => (typeof window !== "undefined" && window.__SB_KEY__)  || import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Read-only headers — anon key is acceptable for SELECT operations.
function readHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": KEY(),
    "Authorization": `Bearer ${KEY()}`,
  };
}

// Write headers — must use the authenticated user JWT.
// If no session is available the write is intentionally skipped by the
// caller; we do NOT fall back to the anon key because the anon key
// has no INSERT permission on task_notifications (and shouldn't).
function writeHeaders(accessToken) {
  return {
    "Content-Type": "application/json",
    "apikey": KEY(),
    "Authorization": `Bearer ${accessToken}`,
    "Prefer": "return=minimal",
  };
}

// Retrieve the stored user access token. Returns null if not found so
// callers can decide whether to proceed or bail out gracefully.
function getStoredToken() {
  try {
    const raw = localStorage.getItem("sb_session");
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s?.access_token || null;
  } catch {
    return null;
  }
}

// ── Find an existing proof request linked to a PulseX task ───

export async function findLinkedProofRequest(taskId) {
  if (!taskId || !BASE()) return null;
  try {
    const res = await fetch(
      `${BASE()}/rest/v1/proof_requests?related_task_id=eq.${taskId}&is_archived=eq.false&limit=1`,
      { headers: readHeaders() }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0] || null;
  } catch { return null; }
}

// ── Mark a PulseX task/subtask as Done ───────────────────────

export async function markPulseXTaskDone(taskId, accessToken) {
  if (!taskId || !BASE()) return { error: "Not configured" };
  const hdrs = { ...writeHeaders(accessToken), "Prefer": "return=minimal" };
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

  // Require a real user JWT — do NOT fall back to the anon key.
  // The anon key has no INSERT permission on task_notifications.
  const token = accessToken || getStoredToken();
  if (!token) {
    console.warn("[ProofIntegration] No auth token available — notification skipped");
    return;
  }

  const hdrs   = writeHeaders(token);
  const msg    = `Proofing is complete for "${taskTitle || "Proof Request"}" on "${projectName || ""}".`;
  const url    = `${BASE()}/rest/v1/task_notifications`;
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

      // Retry with minimal fields — safe for any table schema. Keep the
      // explicit "proof_complete" type so it renders the right action in PulseX.
      const minimalNotif = {
        id:                    notifId,
        task_id:               taskId || null,
        notification_type:     "proof_complete",
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

    console.log("[ProofIntegration] Notification sent, id:", notifId, "→ member:", recipientMemberId);
  } catch (e) {
    console.error("[ProofIntegration] notification threw:", e.message);
  }
}

// ── Find proofreaders scoped to the account director's business unit ────

export async function findScopedProofreaders(clientName) {
  if (!BASE() || !clientName) return [];
  const hdrs = readHeaders();
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

// ── Global fallback: everyone with role = "proofreading" ────────────────

export async function findAllProofreadersByRole() {
  if (!BASE()) return [];
  try {
    const res = await fetch(
      `${BASE()}/rest/v1/team_members?role=eq.proofreading&select=id`,
      { headers: readHeaders() }
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

export async function notifyNewProofRequest({
  proofreaderMemberIds = [], client, projectName, submittedBy, proofRequestId,
}) {
  if (!BASE() || !proofreaderMemberIds.length) return;

  // Require a real user JWT — do NOT fall back to the anon key.
  const token = getStoredToken();
  if (!token) {
    console.warn("[ProofIntegration] No auth token — new-request notifications skipped");
    return;
  }

  const hdrs = writeHeaders(token);
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

const PREFILL_KEY = "proof_queue_prefill";

export function storePrefill(data) {
  try { localStorage.setItem(PREFILL_KEY, JSON.stringify({ ...data, _ts: Date.now() })); } catch {}
}

export function readAndClearPrefill() {
  try {
    const raw = localStorage.getItem(PREFILL_KEY);
    if (!raw) return null;
    try { localStorage.removeItem(PREFILL_KEY); } catch {}
    const parsed = JSON.parse(raw);
    if (parsed._ts && Date.now() - parsed._ts > 120000) return null; // stale after 2 min
    delete parsed._ts;
    return parsed;
  } catch { return null; }
}