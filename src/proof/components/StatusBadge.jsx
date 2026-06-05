import React from "react";
import { STATUS_META } from "../lib/proofTypes";

export default function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META["Submitted"];
  return (
    <span
      style={{
        fontSize:       11,
        fontWeight:     700,
        color:          m.color,
        background:     m.bg,
        borderRadius:   4,
        padding:        "2px 8px",
        whiteSpace:     "nowrap",
        display:        "inline-block",
      }}
    >
      {status}
    </span>
  );
}