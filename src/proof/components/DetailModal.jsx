import React, { useState } from "react";
import { PROOF_COLORS as C, STATUS_META, PRIORITY_META, fmtDate, isOverdue } from "../lib/proofTypes";
import StatusBadge     from "./StatusBadge";
import DepartmentBadge from "./DepartmentBadge";
import AssignModal     from "./AssignModal";

export default function DetailModal({ req, currentUser, onClose, onEdit, onStatusChange, onAssign }) {
  const [showAssign, setShowAssign] = useState(false);

  const m          = STATUS_META[req.status] || STATUS_META["Submitted"];
  const over       = isOverdue(req.due_date, req.status);
  const nextStatus = { Submitted:"Assigned", Assigned:"In Review", "In Review":"Complete" }[req.status];

  const priorityColor = PRIORITY_META[req.priority] || "#94a3b8";

  return (
    <>
      {showAssign && (
        <AssignModal
          req={req}
          currentUser={currentUser}
          onCancel={() => setShowAssign(false)}
          onAssign={(p, d) => { onAssign(req.id, p, d); setShowAssign(false); }}
        />
      )}

      <div
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}
        onClick={onClose}
      >
        <div
          style={{ background:C.card, borderRadius:12, padding:28, maxWidth:580, width:"100%", maxHeight:"90vh", overflowY:"auto" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Title */}
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:C.navy }}>{req.project_name}</h2>
              <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>
                {req.client}{req.project_number ? ` · ${req.project_number}` : ""}
              </div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, color:C.muted, cursor:"pointer", padding:"0 4px" }}>×</button>
          </div>

          {/* Badges */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:18 }}>
            <StatusBadge status={req.status} />
            <span style={{ fontSize:11, fontWeight:700, color:priorityColor, background:priorityColor+"18", borderRadius:4, padding:"2px 8px" }}>
              {req.priority}
            </span>
            <DepartmentBadge department={req.department} />
            <span style={{ fontSize:11, color:C.muted, background:"#f1f5f9", borderRadius:4, padding:"2px 8px" }}>
              {req.request_type}
            </span>
            {over && (
              <span style={{ fontSize:11, fontWeight:700, color:"#ef4444", background:"#fee2e2", borderRadius:4, padding:"2px 8px" }}>OVERDUE</span>
            )}
          </div>

          {/* Details grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
            {[
              ["Task #",       req.task_number || "—"],
              ["Due Date",     fmtDate(req.due_date)],
              ["Submitted By", req.submitted_by || "—"],
              ["Proofreader",  req.assigned_proofreader || "⚠ Unassigned"],
              ["Created",      fmtDate(req.created_at)],
              ["Completed",    req.completed_at ? fmtDate(req.completed_at) : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize:11, fontWeight:600, color:C.muted }}>{k}</div>
                <div style={{
                  fontSize:   13,
                  color:      k === "Proofreader" && !req.assigned_proofreader ? "#f59e0b" : C.text,
                  fontWeight: k === "Proofreader" && !req.assigned_proofreader ? 600 : 400,
                  marginTop:  2,
                }}>
                  {v}
                </div>
              </div>
            ))}
          </div>

          {/* Audit trail */}
          {(req.created_by || req.assigned_by || req.status_changed_by || req.updated_by) && (
            <div style={{ background:"#f8fafc", borderRadius:8, padding:"10px 14px", marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:6 }}>Audit Trail</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:11, color:C.muted }}>
                {req.created_by      && <span>📋 Submitted by <strong>{req.created_by}</strong></span>}
                {req.assigned_by && req.assigned_proofreader && <span>👤 Assigned by <strong>{req.assigned_by}</strong></span>}
                {req.status_changed_by && <span>🔄 Last status change by <strong>{req.status_changed_by}</strong></span>}
                {req.updated_by && req.updated_by !== req.created_by && <span>✏️ Last edited by <strong>{req.updated_by}</strong></span>}
              </div>
            </div>
          )}

          {/* Text fields */}
          {req.instructions && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:600, color:C.muted, marginBottom:4 }}>Instructions</div>
              <div style={{ fontSize:13, color:C.text, background:"#f8fafc", borderRadius:6, padding:"10px 12px", lineHeight:1.5 }}>{req.instructions}</div>
            </div>
          )}
          {req.comments && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:600, color:C.muted, marginBottom:4 }}>Comments</div>
              <div style={{ fontSize:13, color:C.text, background:"#f8fafc", borderRadius:6, padding:"10px 12px", lineHeight:1.5 }}>{req.comments}</div>
            </div>
          )}
          {req.sharepoint_link && (
            <div style={{ marginBottom:18 }}>
              <a href={req.sharepoint_link} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color:C.teal, fontWeight:600 }}>
                Open in SharePoint ↗
              </a>
            </div>
          )}

          {/* Actions */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button
              onClick={() => onEdit(req)}
              style={{ padding:"9px 16px", background:C.tealL, color:C.teal, border:`1px solid ${C.teal}40`, borderRadius:7, cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit" }}
            >
              Edit
            </button>

            {req.status === "Submitted" && (
              <button
                onClick={() => setShowAssign(true)}
                style={{ padding:"9px 16px", background:"#dbeafe", color:"#3b82f6", border:"1px solid #3b82f640", borderRadius:7, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}
              >
                Assign &amp; Move to Assigned →
              </button>
            )}

            {req.status !== "Submitted" && nextStatus && (
              <button
                onClick={() => onStatusChange(req.id, nextStatus)}
                style={{ padding:"9px 16px", background:m.bg, color:m.color, border:`1px solid ${m.color}40`, borderRadius:7, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}
              >
                Move to {nextStatus} →
              </button>
            )}

            {req.status !== "Complete" && (
              <button
                onClick={() => onStatusChange(req.id, "Complete")}
                style={{ padding:"9px 16px", background:"#d1fae5", color:"#10b981", border:"1px solid #10b98140", borderRadius:7, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}
              >
                ✓ Mark Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}