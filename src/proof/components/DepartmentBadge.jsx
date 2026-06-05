import React from "react";
import { DEPT_META } from "../lib/proofTypes";

export default function DepartmentBadge({ department }) {
  if (!department) return null;
  const m = DEPT_META[department] || { color: "#6b7280", bg: "#f9fafb" };
  return (
    <span
      style={{
        fontSize:     10,
        fontWeight:   600,
        color:        m.color,
        background:   m.bg,
        borderRadius: 4,
        padding:      "1px 7px",
        whiteSpace:   "nowrap",
        display:      "inline-block",
      }}
    >
      {department}
    </span>
  );
}