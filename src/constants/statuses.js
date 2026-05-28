export const STATUSES = ["Not Started", "In Progress", "Done", "Blocked"];

export const statusMeta = {
  "Not Started":        { color: "#64748b", bg: "rgba(100,116,139,0.1)",  icon: "○",  border: "rgba(100,116,139,0.35)" },
  "In Progress":        { color: "#0ea5e9", bg: "rgba(14,165,233,0.1)",   icon: "◑",  border: "rgba(14,165,233,0.4)"  },
  "Done":               { color: "#10b981", bg: "rgba(16,185,129,0.1)",   icon: "✓",  border: "rgba(16,185,129,0.4)"  },
  "Blocked":            { color: "#ef4444", bg: "rgba(239,68,68,0.1)",    icon: "⊘",  border: "rgba(239,68,68,0.4)"   },
  "Editorial Review":   { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  icon: "✍",  border: "rgba(139,92,246,0.4)"  },
  "Design Review":      { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "◈",  border: "rgba(245,158,11,0.4)"  },
  "Proof Review":       { color: "#f97316", bg: "rgba(249,115,22,0.1)",  icon: "⊙",  border: "rgba(249,115,22,0.4)"  },
  "Internal Review":    { color: "#6366f1", bg: "rgba(99,102,241,0.1)",  icon: "◎",  border: "rgba(99,102,241,0.4)"  },
  "Client Review":      { color: "#ec4899", bg: "rgba(236,72,153,0.1)",  icon: "◉",  border: "rgba(236,72,153,0.4)"  },
  "On Track":           { color: "#10b981", bg: "rgba(16,185,129,0.1)",  icon: "↑",  border: "rgba(16,185,129,0.4)"  },
  "At Risk":            { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "⚠",  border: "rgba(245,158,11,0.4)"  },
  "Off Track":          { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: "↓",  border: "rgba(239,68,68,0.4)"   },
};
