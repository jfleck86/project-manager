// ============================================================
// proofTypes.js — Shared constants for Proof Queue
// Isolated from PulseX. Import from here, not from App.jsx.
// ============================================================

export const PROOF_COLORS = {
  bg:     "#f8f9fb",
  card:   "#ffffff",
  border: "rgba(0,0,0,0.08)",
  navy:   "#1e293b",
  teal:   "#0ea5e9",
  tealL:  "#e0f2fe",
  text:   "#1e293b",
  muted:  "#64748b",
};

export const STATUS_META = {
  "Submitted": { color: "#f59e0b", bg: "#fef3c7" },
  "Assigned":  { color: "#3b82f6", bg: "#dbeafe" },
  "In Review": { color: "#8b5cf6", bg: "#ede9fe" },
  "Complete":  { color: "#10b981", bg: "#d1fae5" },
};

export const PRIORITY_META = {
  Low:    "#94a3b8",
  Medium: "#f59e0b",
  High:   "#f97316",
  Urgent: "#ef4444",
};

export const DEPT_META = {
  "Editorial":        { color: "#0ea5e9", bg: "#e0f2fe" },
  "Design":           { color: "#8b5cf6", bg: "#ede9fe" },
  "Client Services":  { color: "#10b981", bg: "#d1fae5" },
  "Strategy":         { color: "#f59e0b", bg: "#fef3c7" },
  "Development":      { color: "#f97316", bg: "#fff7ed" },
  "Account":          { color: "#6b7280", bg: "#f9fafb" },
};

export const REQUEST_TYPES = [
  "Full Read",
  "Check Changes",
  "Grammar Only",
  "Style Guide Check",
  "Other",
];

export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export const STATUSES = ["Submitted", "Assigned", "In Review", "Complete"];

export const DEPARTMENTS = [
  "Editorial",
  "Design",
  "Client Services",
  "Strategy",
  "Development",
  "Account",
];

export const PROOFREADERS = [
  "Sam Torres",
  "Jordan Rivers",
  "Riley Park",
  "Alex Kim",
  "Maya Chen",
];

// Default department per proofreader — editable per request.
// When merged into PulseX, replace with team_members.department lookup.
export const PROOFREADER_DEPT = {
  "Sam Torres":    "Editorial",
  "Jordan Rivers": "Editorial",
  "Riley Park":    "Design",
  "Alex Kim":      "Development",
  "Maya Chen":     "Strategy",
};

// ── Date helpers ─────────────────────────────────────────────
export const todayStr  = () => new Date().toISOString().slice(0, 10);
export const thisMonth = () => new Date().toISOString().slice(0, 7);
export const isOverdue = (due, status) =>
  due && due < todayStr() && status !== "Complete";

export const fmtDate = (d) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day:   "numeric",
      })
    : "—";

// ── Empty form template ───────────────────────────────────────
export const EMPTY_FORM = {
  client:               "",
  project_name:         "",
  project_number:       "",
  task_number:          "",
  request_type:         "Full Read",
  priority:             "Medium",
  department:           "",
  due_date:             "",
  sharepoint_link:      "",
  instructions:         "",
  comments:             "",
  submitted_by:         "",
  assigned_proofreader: "",
  status:               "Submitted",
};