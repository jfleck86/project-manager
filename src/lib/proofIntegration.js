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
      const s = JSON.parse(localStorage.getItem("sb_session") || "null");
      return s?.access_token || KEY();
    } catch { return KEY(); }
  })();

  const hdrs = { "Content-Type": "application/json", apikey: KEY(), Authorization: `Bearer ${token}`, Prefer: "return=minimal" };
  const msg  = `Proofing is complete for "${taskTitle || "Proof Request"}" on "${projectName || ""}".`;
  const url  = `${BASE()}/rest/v1/task_notifications`;

  // Attempt 1: full notification with all fields (requires proof_queue_integration.sql for extra columns)
  const fullNotif = {
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

    // If constraint error on notification_type or unknown column, retry with minimal fields
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("[ProofIntegration] Full notification failed:", res.status, errText.slice(0, 200));

      const minimalNotif = {
        task_id:               taskId || null,
        notification_type:     "task_completed",   // always-valid fallback type
        message:               msg,
        assigned_to_person_id: recipientMemberId,
        is_read:               false,
        created_at:            new Date().toISOString(),
      };
      res = await fetch(url, { method: "POST", headers: hdrs, body: JSON.stringify(minimalNotif) });

      if (!res.ok) {
        const err2 = await res.text().catch(() => "");
        console.error("[ProofIntegration] Minimal notification also failed:", res.status, err2.slice(0, 200));
        return;
      }
    }

    console.log("[ProofIntegration] ✓ Completion notification sent to member:", recipientMemberId);
  } catch (e) {
    console.error("[ProofIntegration] notification threw:", e.message);
  }
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
    const raw = localStorage.getItem(PREFILL_KEY);
    if (!raw) return null;
    localStorage.removeItem(PREFILL_KEY);
    const parsed = JSON.parse(raw);
    if (parsed._ts && Date.now() - parsed._ts > 120000) return null; // stale
    delete parsed._ts;
    return parsed;
  } catch { return null; }
}