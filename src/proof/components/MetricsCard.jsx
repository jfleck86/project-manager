import React from "react";
import { PROOF_COLORS as C } from "../lib/proofTypes";

export default function MetricsCard({ label, value, color, sub }) {
  return (
    <div
      style={{
        background:   C.card,
        border:       `1px solid ${C.border}`,
        borderRadius: 8,
        padding:      "16px 20px",
        textAlign:    "center",
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 900, color: color || C.navy, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>{label}</div>
      {sub && (
        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}