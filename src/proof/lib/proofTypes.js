// ============================================================
// proofTypes.js — Shared constants for Proof Queue
// Branded to match PulseX design system.
// ============================================================

export const PROOF_COLORS = {
  bg:       "#f5f6f8",           // matches PulseX background
  card:     "#ffffff",
  border:   "rgba(0,0,0,0.08)",
  navy:     "#002A4E",           // BRAND_NAVY
  teal:     "#00B5B5",           // BRAND_TEAL
  tealL:    "rgba(0,181,181,0.15)",  // BRAND_TEAL_L
  tealD:    "#007a7a",           // BRAND_TEAL_D
  text:     "#1f2937",
  muted:    "#6b7280",
  font:     '"Roboto", Arial, sans-serif',
};

export const STATUS_META = {
  "Submitted":  { color: "#6366f1", bg: "rgba(99,102,241,0.1)",  label: "Submitted"  },
  "Assigned":   { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  label: "Assigned"   },
  "In Review":  { color: "#0ea5e9", bg: "rgba(14,165,233,0.1)",  label: "In Review"  },
  "Complete":   { color: "#10b981", bg: "rgba(16,185,129,0.1)",  label: "Complete"   },
  "On Hold":    { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   label: "On Hold"    },
};

export const PRIORITY_META = {
  "Urgent": { color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
  "High":   { color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  "Medium": { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  "Low":    { color: "#6b7280", bg: "rgba(107,114,128,0.1)"},
};

export const REQUEST_TYPES = [
  "Full Read", "Check Changes", "Style Guide Check", "Factual Check", "Legal Review", "Final Pass",
];

export const PROOFREADERS = ["Sam Torres", "Riley Park", "Jordan Rivers", "Alex Kim"];

export function todayStr() { return new Date().toISOString().slice(0, 10); }

export const STATUSES = ["Submitted", "Assigned", "In Review", "Complete", "On Hold"];
export const PRIORITIES = ["Urgent", "High", "Medium", "Low"];

export function fmtDate(str) {
  if (!str) return "—";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isOverdue(dateStr, status) {
  if (!dateStr || status === "Complete") return false;
  return dateStr < new Date().toISOString().slice(0, 10);
}

export const DEPT_META = {
  "Editorial":          { color: "#f59e0b", icon: "✍" },
  "Design":             { color: "#e879f9", icon: "◈" },
  "Proof":              { color: "#fb923c", icon: "◉" },
  "Strategy":           { color: "#38bdf8", icon: "◆" },
  "Account":            { color: "#34d399", icon: "◎" },
  "Project Management": { color: "#6366f1", icon: "◎" },
  "Production":         { color: "#4b5563", icon: "▣" },
  "Client Review":      { color: "#a78bfa", icon: "◎" },
};

export function thisMonth() { return new Date().toISOString().slice(0, 7); }

export const DEPARTMENTS = [
  "Editorial", "Design", "Proof", "Strategy", "Account",
  "Project Management", "Production", "Client Review",
];

export const EMPTY_FORM = {
  client: "", project_name: "", project_number: "", task_number: "",
  request_type: "Full Read", priority: "Medium", department: "",
  due_date: "", submitted_by: "", assigned_proofreader: "",
  status: "Submitted", instructions: "", sharepoint_link: "",
};