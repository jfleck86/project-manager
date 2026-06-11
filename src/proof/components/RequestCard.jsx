// @ts-nocheck
import React from "react";
import { PROOF_COLORS as C, STATUS_META, fmtDate, isOverdue } from "../lib/proofTypes";
import StatusBadge     from "./StatusBadge";
import PriorityDot     from "./PriorityDot";
import DepartmentBadge from "./DepartmentBadge";

export default function RequestCard({ req, onView, onEdit, onQuickAssign, onArchive, onUnarchive }) {
  const over        = isOverdue(req.due_date, req.status);
  const borderColor = STATUS_META[req.status]?.color || "#ccc";

  return (
    <div
      onClick={() => onView && onView(req)}
      style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${borderColor}`, borderRadius:8, padding:"12px 14px", cursor:onView?"pointer":"default", transition:"box-shadow 0.15s", opacity:req.is_archived ? 0.65 : 1 }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.1)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
    >
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:2 }}>
            <PriorityDot priority={req.priority} />
            <span style={{ fontSize:13, fontWeight:700, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{req.project_name}</span>
          </div>
          <div style={{ fontSize:11, color:C.muted }}>{req.client}{req.project_number ? ` · #${req.project_number}` : ""}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
          <StatusBadge status={req.status} />
          {req.is_archived && (
            <span style={{ fontSize:9, color:"#9ca3af", background:"#f1f5f9", borderRadius:3, padding:"1px 5px" }}>ARCHIVED</span>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap", alignItems:"center" }}>
        {req.department && <DepartmentBadge department={req.department} />}
        <span style={{ fontSize:11, color:C.muted }}>🔍 {req.request_type}</span>
        <span style={{ fontSize:11, color:over?"#ef4444":C.muted, fontWeight:over?700:400 }}>
          📅 {fmtDate(req.due_date)}{over ? " OVERDUE" : ""}
        </span>
        {req.related_task_id && (
          <span style={{ fontSize:9, color:"#0ea5e9", background:"#e0f2fe", borderRadius:3, padding:"1px 5px" }}>🔗 PulseX</span>
        )}
      </div>

      {/* SharePoint link — prominent, always visible when present */}
      {req.sharepoint_link && (
        <a
          href={req.sharepoint_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => { e.stopPropagation(); e.nativeEvent?.stopImmediatePropagation?.(); }}
          style={{ display:"flex", alignItems:"center", gap:5, marginTop:8, padding:"5px 8px", background:"#f0fdf4", border:"1px solid #16a34a30", borderRadius:5, textDecoration:"none", color:"#166534", fontSize:11, fontWeight:600, overflow:"hidden" }}
        >
          <span style={{ flexShrink:0 }}>📎</span>
          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
            {req.sharepoint_link.replace(/^https?:\/\//, "").slice(0, 60)}{req.sharepoint_link.length > 63 ? "…" : ""}
          </span>
          <span style={{ flexShrink:0, opacity:0.6 }}>↗</span>
        </a>
      )}

      {/* Assignee */}
      {req.assigned_proofreader
        ? <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>👤 {req.assigned_proofreader}</div>
        : req.status === "Submitted" && (
          <div style={{ fontSize:11, color:"#f59e0b", fontWeight:600, marginTop:6 }}>⚠ Unassigned</div>
        )}

      {/* Actions */}
      <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
        {onEdit && (
          <button onClick={e => { e.stopPropagation(); onEdit(req); }}
            style={{ fontSize:11, padding:"4px 10px", background:C.tealL, color:C.teal, border:`1px solid ${C.teal}40`, borderRadius:5, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
            Edit
          </button>
        )}
        {onQuickAssign && req.status === "Submitted" && !req.is_archived && (
          <button onClick={e => { e.stopPropagation(); onQuickAssign(req); }}
            style={{ fontSize:11, padding:"4px 10px", background:"#dbeafe", color:"#3b82f6", border:"1px solid #3b82f640", borderRadius:5, cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}>
            Assign →
          </button>
        )}
        {!req.is_archived && req.status === "Complete" && onArchive && (
          <button onClick={e => { e.stopPropagation(); onArchive(req.id); }}
            style={{ fontSize:11, padding:"4px 10px", background:"#f1f5f9", color:"#6b7280", border:"1px solid #e2e8f0", borderRadius:5, cursor:"pointer", fontFamily:"inherit" }}>
            📦 Archive
          </button>
        )}
        {req.is_archived && onUnarchive && (
          <button onClick={e => { e.stopPropagation(); onUnarchive(req.id); }}
            style={{ fontSize:11, padding:"4px 10px", background:"#fef3c7", color:"#92400e", border:"1px solid #fcd34d", borderRadius:5, cursor:"pointer", fontFamily:"inherit" }}>
            ↩ Unarchive
          </button>
        )}
      </div>
    </div>
  );
}
