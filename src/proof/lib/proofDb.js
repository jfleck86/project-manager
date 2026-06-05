// ============================================================
// proofDb.js — Supabase operations for Proof Queue
// Only touches proof_requests and proof_notifications.
// Uses the same VITE_ env vars as PulseX — no separate project.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "";
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const READY = !!supabase;

if (!READY) {
  console.warn("[ProofQueue] Supabase not configured — running in offline/demo mode.");
}

// ── Row mappers ───────────────────────────────────────────────

/** DB row → in-memory request object */
function rowToRequest(row) {
  return {
    id:                   row.id,
    client:               row.client               || "",
    project_name:         row.project_name         || "",
    project_number:       row.project_number        || "",
    task_number:          row.task_number           || "",
    request_type:         row.request_type          || "Full Read",
    priority:             row.priority              || "Medium",
    department:           row.department            || "",
    due_date:             row.due_date              || "",
    sharepoint_link:      row.sharepoint_link       || "",
    instructions:         row.instructions          || "",
    comments:             row.comments              || "",
    submitted_by:         row.submitted_by          || "",
    assigned_proofreader: row.assigned_proofreader  || null,
    status:               row.status                || "Submitted",
    created_at:           row.created_at            || null,
    updated_at:           row.updated_at            || null,
    completed_at:         row.completed_at          || null,
    // Audit fields
    created_by:           row.created_by            || null,
    updated_by:           row.updated_by            || null,
    status_changed_by:    row.status_changed_by     || null,
    assigned_by:          row.assigned_by           || null,
    // PulseX merge placeholders
    related_project_id:      row.related_project_id      || null,
    related_deliverable_id:  row.related_deliverable_id  || null,
    related_task_id:         row.related_task_id         || null,
    related_client_id:       row.related_client_id       || null,
    submitted_by_member_id:  row.submitted_by_member_id  || null,
    assigned_member_id:      row.assigned_member_id      || null,
  };
}

/** In-memory request object → DB row */
function requestToRow(req) {
  return {
    id:                   req.id,
    client:               req.client               || null,
    project_name:         req.project_name         || null,
    project_number:       req.project_number       || null,
    task_number:          req.task_number          || null,
    request_type:         req.request_type         || "Full Read",
    priority:             req.priority             || "Medium",
    department:           req.department           || null,
    due_date:             req.due_date             || null,
    sharepoint_link:      req.sharepoint_link      || null,
    instructions:         req.instructions         || null,
    comments:             req.comments             || null,
    submitted_by:         req.submitted_by         || null,
    assigned_proofreader: req.assigned_proofreader || null,
    status:               req.status               || "Submitted",
    // Audit
    created_by:           req.created_by           || null,
    updated_by:           req.updated_by           || null,
    status_changed_by:    req.status_changed_by    || null,
    assigned_by:          req.assigned_by          || null,
    // PulseX placeholders (pass through if set)
    related_project_id:      req.related_project_id      || null,
    related_deliverable_id:  req.related_deliverable_id  || null,
    related_task_id:         req.related_task_id         || null,
    related_client_id:       req.related_client_id       || null,
    submitted_by_member_id:  req.submitted_by_member_id  || null,
    assigned_member_id:      req.assigned_member_id      || null,
  };
}

/** DB row → in-memory notification */
function rowToNotif(row) {
  return {
    id:           row.id,
    request_id:   row.request_id,
    type:         row.type,
    recipient:    row.recipient,
    message:      row.message,
    is_read:      row.is_read      || false,
    triggered_by: row.triggered_by || null,
    created_at:   row.created_at   || null,
  };
}

// ── proof_requests operations ─────────────────────────────────

/** Fetch all requests (newest first) */
export async function fetchRequests() {
  if (!READY) return { data: [], error: null };
  const { data, error } = await supabase
    .from("proof_requests")
    .select("*")
    .order("created_at", { ascending: false });
  return { data: error ? [] : data.map(rowToRequest), error };
}

/** Upsert a single request (insert or update) */
export async function saveRequest(req) {
  if (!READY) return { data: req, error: null };
  const row = requestToRow(req);
  const { data, error } = await supabase
    .from("proof_requests")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  return { data: error ? req : rowToRequest(data), error };
}

/** Update specific fields on a request */
export async function updateRequest(id, fields) {
  if (!READY) return { error: null };
  const { error } = await supabase
    .from("proof_requests")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error };
}

/** Soft-delete: not implemented in v2 prototype — just delete */
export async function deleteRequest(id) {
  if (!READY) return { error: null };
  const { error } = await supabase
    .from("proof_requests")
    .delete()
    .eq("id", id);
  return { error };
}

// ── proof_notifications operations ───────────────────────────

/** Fetch unread notifications for a recipient */
export async function fetchNotifications(recipient) {
  if (!READY) return { data: [], error: null };
  const { data, error } = await supabase
    .from("proof_notifications")
    .select("*")
    .eq("recipient", recipient)
    .order("created_at", { ascending: false })
    .limit(50);
  return { data: error ? [] : data.map(rowToNotif), error };
}

/** Insert a notification */
export async function createNotification({ requestId, type, recipient, message, triggeredBy }) {
  if (!READY) return { error: null };
  const { error } = await supabase.from("proof_notifications").insert({
    request_id:   requestId,
    type,
    recipient,
    message,
    triggered_by: triggeredBy || null,
    is_read:      false,
    created_at:   new Date().toISOString(),
  });
  return { error };
}

/** Mark a notification as read */
export async function markNotifRead(id) {
  if (!READY) return { error: null };
  const { error } = await supabase
    .from("proof_notifications")
    .update({ is_read: true })
    .eq("id", id);
  return { error };
}

export { READY as DB_READY };