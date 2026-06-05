import React from "react";
import { PROOF_COLORS as C, STATUS_META, fmtDate, isOverdue } from "../lib/proofTypes";
import StatusBadge    from "./StatusBadge";
import PriorityDot    from "./PriorityDot";
import DepartmentBadge from "./DepartmentBadge";

export default function RequestCard({ req, onView, onEdit, onQuickAssign }) {
  const over = isOverdue(req.due_date, req.status);
  const borderColor = STATUS_META[req.status]?.color || "#ccc";

  return (
    <div
      onClick={() => onView(req)}
      style={{
        background:   C.card,
        border:       `1px solid ${C.border}`,
        borderLeft:   `3px solid ${borderColor}`,
        borderRadius: 8,
        padding:      "12px 14px",
        cursor:       "pointer",
        transition:   "box-shadow 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.1)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
    >
      {/* Header row */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:2 }}>
            <PriorityDot priority={req.priority} />
            <span style={{ fontSize:13, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {req.project_name}
            </span>
          </div>
          <div style={{ fontSize:11, color:C.muted }}>
            {req.client}{req.project_number ? ` · #${req.project_number}` : ""}
          </div>
        </div>
        <StatusBadge status={req.status} />
      </div>

      {/* Meta row */}
      <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap", alignItems:"center" }}>
        <DepartmentBadge department={req.department} />
        <span style={{ fontSize:11, color:C.muted }}>🔍 {req.request_type}</span>
        <span style={{ fontSize:11, color:over ? "#ef4444" : C.muted, fontWeight:over ? 700 : 400 }}>
          📅 {fmtDate(req.due_date)}{over ? " OVERDUE" : ""}
        </span>
      </div>

      {/* Assignee */}
      {req.assigned_proofreader ? (
        <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>👤 {req.assigned_proofreader}</div>
      ) : req.status === "Submitted" ? (
        <div style={{ fontSize:11, color:"#f59e0b", fontWeight:600, marginTop:4 }}>⚠ Unassigned</div>
      ) : null}

      {/* Actions */}
      <div style={{ display:"flex", gap:6, marginTop:10 }}>
        <button
          onClick={e => { e.stopPropagation(); onEdit(req); }}
          style={{ fontSize:11, padding:"4px 10px", background:C.tealL, color:C.teal, border:`1px solid ${C.teal}40`, borderRadius:5, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}
        >
          Edit
        </button>
        {req.status === "Submitted" && (
          <button
            onClick={e => { e.stopPropagation(); onQuickAssign(req); }}
            style={{ fontSize:11, padding:"4px 10px", background:"#dbeafe", color:"#3b82f6", border:"1px solid #3b82f640", borderRadius:5, cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}
          >
            Assign →
          </button>
        )}
        {req.sharepoint_link && (
          <a
            href={req.sharepoint_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ fontSize:11, padding:"4px 10px", background:"#f0fdf4", color:"#16a34a", border:"1px solid #16a34a40", borderRadius:5, textDecoration:"none", fontWeight:600 }}
          >
            SP ↗
          </a>
        )}
      </div>
    </div>
  );
}