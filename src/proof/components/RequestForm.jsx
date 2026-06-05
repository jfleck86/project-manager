import React, { useState } from "react";
import {
  PROOF_COLORS as C,
  REQUEST_TYPES, PRIORITIES, STATUSES, DEPARTMENTS,
  EMPTY_FORM, todayStr,
} from "../lib/proofTypes";

export default function RequestForm({ initial, currentUser, proofreaders, proofreadersErr, onSave, onCancel }) {
  const isNew = !initial?.id;
  const [form, setForm] = useState(
    initial ? { ...initial } : { ...EMPTY_FORM, submitted_by: currentUser || "" }
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleSubmit() {
    if (!form.client.trim())       { alert("Client is required.");       return; }
    if (!form.project_name.trim()) { alert("Project Name is required."); return; }
    if (!form.submitted_by.trim()) { alert("Submitted By is required."); return; }

    // Resolve proofreader UUID from the name stored in form
    const pr = proofreaders.find(p => p.name === form.assigned_proofreader);
    onSave({ ...form, assigned_proofreader_id: pr?.id || form.assigned_proofreader_id || null });
  }

  const fs = { width:"100%", padding:"8px 10px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, fontFamily:"inherit", boxSizing:"border-box", outline:"none" };
  const ls = { fontSize:12, fontWeight:600, color:C.muted, display:"block", marginBottom:4 };

  return (
    <div style={{ background:C.card, borderRadius:10, padding:28, maxWidth:640, width:"100%" }}>
      <h2 style={{ margin:"0 0 20px", fontSize:17, fontWeight:800, color:C.navy }}>
        {isNew ? "New Proof Request" : "Edit Proof Request"}
      </h2>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div><label style={ls}>Client *</label><input style={fs} value={form.client} onChange={e=>set("client",e.target.value)} placeholder="Client name" /></div>
        <div><label style={ls}>Project Name *</label><input style={fs} value={form.project_name} onChange={e=>set("project_name",e.target.value)} placeholder="Project name" /></div>
        <div><label style={ls}>Project Number</label><input style={fs} value={form.project_number} onChange={e=>set("project_number",e.target.value)} placeholder="23-041" /></div>
        <div><label style={ls}>Task Number</label><input style={fs} value={form.task_number} onChange={e=>set("task_number",e.target.value)} placeholder="T-12" /></div>
        <div>
          <label style={ls}>Request Type</label>
          <select style={fs} value={form.request_type} onChange={e=>set("request_type",e.target.value)}>
            {REQUEST_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={ls}>Priority</label>
          <select style={fs} value={form.priority} onChange={e=>set("priority",e.target.value)}>
            {PRIORITIES.map(p=><option key={p}>{p}</option>)}
          </select>
        </div>
        <div><label style={ls}>Due Date</label><input type="date" style={fs} value={form.due_date} onChange={e=>set("due_date",e.target.value)} /></div>
        <div>
          <label style={ls}>Status</label>
          <select style={fs} value={form.status} onChange={e=>set("status",e.target.value)}>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label style={ls}>Submitted By *</label><input style={fs} value={form.submitted_by} onChange={e=>set("submitted_by",e.target.value)} placeholder="Your name" /></div>

        {/* Proofreader dropdown — driven by Supabase proofreaders table */}
        <div>
          <label style={ls}>Assign Proofreader</label>
          {proofreadersErr ? (
            <div style={{ fontSize:11, color:"#f59e0b", padding:"8px 0" }}>⚠ {proofreadersErr}</div>
          ) : (
            <select
              style={fs}
              value={form.assigned_proofreader || ""}
              onChange={e => set("assigned_proofreader", e.target.value)}
              disabled={proofreaders.length === 0}
            >
              <option value="">— Unassigned —</option>
              {proofreaders.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Department — kept in form for categorisation but not a primary reporting dimension */}
        <div style={{ gridColumn:"1 / -1" }}>
          <label style={ls}>
            Department{" "}
            <span style={{ fontWeight:400, color:"#94a3b8" }}>(optional)</span>
          </label>
          <select style={fs} value={form.department} onChange={e=>set("department",e.target.value)}>
            <option value="">— No department —</option>
            {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div style={{ gridColumn:"1 / -1" }}><label style={ls}>SharePoint Link</label><input style={fs} value={form.sharepoint_link} onChange={e=>set("sharepoint_link",e.target.value)} placeholder="https://sharepoint.com/..." /></div>
        <div style={{ gridColumn:"1 / -1" }}><label style={ls}>Instructions</label><textarea style={{...fs,height:80,resize:"vertical"}} value={form.instructions} onChange={e=>set("instructions",e.target.value)} placeholder="Proofing instructions..." /></div>
        <div style={{ gridColumn:"1 / -1" }}><label style={ls}>Comments</label><textarea style={{...fs,height:60,resize:"vertical"}} value={form.comments} onChange={e=>set("comments",e.target.value)} /></div>
      </div>

      <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:20 }}>
        <button onClick={onCancel} style={{ padding:"9px 18px", background:"none", border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>Cancel</button>
        <button onClick={handleSubmit} style={{ padding:"9px 18px", background:C.teal, color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>
          {isNew ? "Submit Request" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
