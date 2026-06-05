import React, { useState } from "react";
import { PROOF_COLORS as C, PROOFREADERS, DEPARTMENTS, PROOFREADER_DEPT } from "../lib/proofTypes";

export default function AssignModal({ req, currentUser, onAssign, onCancel }) {
  const [proofreader, setProofreader] = useState(req.assigned_proofreader || "");
  const [dept, setDept] = useState(
    req.department || (req.assigned_proofreader ? PROOFREADER_DEPT[req.assigned_proofreader] || "" : "")
  );

  const fs = {
    width:        "100%",
    padding:      "9px 12px",
    border:       `1px solid ${C.border}`,
    borderRadius: 7,
    fontSize:     13,
    fontFamily:   "inherit",
    boxSizing:    "border-box",
    marginBottom: 14,
    outline:      "none",
  };
  const ls = { fontSize: 12, fontWeight: 600, color: C.muted, display: "block", marginBottom: 5 };

  function handleProofreaderChange(p) {
    setProofreader(p);
    if (!dept && p) setDept(PROOFREADER_DEPT[p] || "");
  }

  function handleSubmit() {
    if (!proofreader) { alert("Please select a proofreader."); return; }
    onAssign(proofreader, dept);
  }

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100, padding:16 }}
      onClick={onCancel}
    >
      <div
        style={{ background:C.card, borderRadius:12, padding:28, maxWidth:400, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin:"0 0 6px", fontSize:16, fontWeight:800, color:C.navy }}>Assign Proofreader</h3>
        <p style={{ margin:"0 0 20px", fontSize:13, color:C.muted }}>
          <strong>{req.project_name}</strong> · {req.client}
        </p>

        <label style={ls}>Proofreader *</label>
        <select value={proofreader} onChange={e => handleProofreaderChange(e.target.value)} style={fs} autoFocus>
          <option value="">— Choose a proofreader —</option>
          {PROOFREADERS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <label style={ls}>
          Department{" "}
          <span style={{ fontWeight:400, color:"#94a3b8" }}>(auto-filled, editable)</span>
        </label>
        <select value={dept} onChange={e => setDept(e.target.value)} style={fs}>
          <option value="">— No department —</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:6 }}>
          <button
            onClick={onCancel}
            style={{ padding:"9px 18px", background:"none", border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer", fontSize:13, fontFamily:"inherit" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{ padding:"9px 18px", background:C.teal, color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}
          >
            Assign &amp; Move to Assigned
          </button>
        </div>
      </div>
    </div>
  );
}
