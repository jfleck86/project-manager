import React, { useState } from "react";
import { PROOF_COLORS as C } from "../lib/proofTypes";

export default function AssignModal({ req, currentUser, proofreaders, proofreadersErr, onAssign, onCancel }) {
  // Find pre-selected proofreader if already assigned
  const initial = proofreaders.find(p => p.name === req.assigned_proofreader) || null;
  const [selectedId, setSelectedId] = useState(initial?.id || "");

  const fs = { width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:"inherit", boxSizing:"border-box", marginBottom:14, outline:"none" };
  const ls = { fontSize:12, fontWeight:600, color:C.muted, display:"block", marginBottom:5 };

  function handleSubmit() {
    if (!selectedId) { alert("Please select a proofreader."); return; }
    const pr = proofreaders.find(p => p.id === selectedId);
    if (!pr) { alert("Selected proofreader not found."); return; }
    onAssign(pr.name, pr.id);
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

        {proofreadersErr && (
          <div style={{ background:"#fef3c7", border:"1px solid #f59e0b40", borderRadius:7, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#92400e" }}>
            ⚠ {proofreadersErr}
          </div>
        )}

        <label style={ls}>Proofreader *</label>
        {proofreaders.length === 0 && !proofreadersErr ? (
          <div style={{ fontSize:12, color:C.muted, padding:"10px 0", marginBottom:14 }}>Loading proofreaders…</div>
        ) : (
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={fs}
            autoFocus
            disabled={proofreaders.length === 0}
          >
            <option value="">— Choose a proofreader —</option>
            {proofreaders.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.email ? ` (${p.email})` : ""}
              </option>
            ))}
          </select>
        )}

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:6 }}>
          <button
            onClick={onCancel}
            style={{ padding:"9px 18px", background:"none", border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer", fontSize:13, fontFamily:"inherit" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={proofreaders.length === 0}
            style={{ padding:"9px 18px", background:proofreaders.length===0?"#94a3b8":C.teal, color:"#fff", border:"none", borderRadius:7, cursor:proofreaders.length===0?"not-allowed":"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}
          >
            Assign &amp; Move to Assigned
          </button>
        </div>
      </div>
    </div>
  );
}
