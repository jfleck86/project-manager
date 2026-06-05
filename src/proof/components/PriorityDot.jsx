import React from "react";
import { PRIORITY_META } from "../lib/proofTypes";

export default function PriorityDot({ priority }) {
  const color = PRIORITY_META[priority] || "#94a3b8";
  return (
    <span
      title={priority}
      style={{
        display:       "inline-block",
        width:         8,
        height:        8,
        borderRadius:  "50%",
        background:    color,
        marginRight:   4,
        flexShrink:    0,
      }}
    />
  );
}