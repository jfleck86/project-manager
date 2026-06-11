// @ts-nocheck
// ============================================================
// ProofApp.jsx — Proof Queue + PulseX integration
// ============================================================
import React, { useState, useEffect } from "react";
import { PROOF_COLORS as C, PROOFREADERS as FALLBACK_PROOFREADERS, todayStr } from "./lib/proofTypes";
import {
  fetchRequestsFiltered, saveRequest, updateRequest,
  fetchProofreaders, archiveRequest, unarchiveRequest, findByTaskId,
  DB_READY, getProofCurrentUser, fetchMemberName, deleteRequest, findMemberIdByName
} from "./lib/proofDb";
import { readAndClearPrefill, markPulseXTaskDone, createProofCompletionNotification } from "../lib/proofIntegration";

import QueueView    from "./components/QueueView";
import MyQueueView  from "./components/MyQueueView";
import ReportsView  from "./components/ReportsView";
import RequestForm  from "./components/RequestForm";
import DetailModal  from "./components/DetailModal";
import AssignModal  from "./components/AssignModal";

const SEED = [
  { id:"pr1", client:"Acme Corp", project_name:"Q3 Newsletter", project_number:"23-041", task_number:"T-12", request_type:"Full Read", priority:"High", department:"Editorial", due_date:"2026-06-10", submitted_by:"Maya Chen", assigned_proofreader:"Sam Torres", status:"In Review", instructions:"Check tone for exec audience.", sharepoint_link:"", created_at:"2026-06-01", created_by:"Maya Chen", is_archived:false },
  { id:"pr2", client:"Globex", project_name:"Product Brochure", project_number:"23-042", task_number:"T-07", request_type:"Check Changes", priority:"Urgent", department:"Design", due_date:"2026-06-06", submitted_by:"Jordan Rivers", assigned_proofreader:"Riley Park", status:"Assigned", instructions:"Only section 2 changed.", sharepoint_link:"", created_at:"2026-06-02", created_by:"Jordan Rivers", is_archived:false },
  { id:"pr3", client:"Initech", project_name:"Annual Report", project_number:"23-039", task_number:"T-03", request_type:"Style Guide Check", priority:"Medium", department:"Editorial", due_date:"2026-06-12", submitted_by:"Riley Park", assigned_proofreader:null, status:"Submitted", instructions:"Full style guide compliance.", sharepoint_link:"", created_at:"2026-06-03", is_archived:false },
  { id:"pr5", client:"Acme Corp", project_name:"Social Media Pack", project_number:"23-041", task_number:"T-14", request_type:"Full Read", priority:"Medium", department:"Strategy", due_date:"2026-05-30", submitted_by:"Maya Chen", assigned_proofreader:"Jordan Rivers", status:"Complete", instructions:"Instagram + LinkedIn copy.", sharepoint_link:"", created_at:"2026-05-28", completed_at:"2026-06-01", is_archived:false },
];

// ── Current user — read from PulseX session (set by supabaseAuth.js on login) ──
// Current user resolved async — starts with cached value, then updates from DB
const _cached = getProofCurrentUser();

export default function ProofApp() {
  // ── Read prefill from sessionStorage IMMEDIATELY (before any async)
  // This ensures the form opens the instant the page loads, not after DB calls complete.
  const [currentUser, setCurrentUser] = useState(_cached?.name || "Proof User");
  const [currentUserId, setCurrentUserId] = useState(_cached?.id || null);
  const [initialPrefill] = useState(() => readAndClearPrefill());

  const [requests,       setRequests]       = useState([]);
  const [proofreaders,   setProofreaders]   = useState([]);
  const [proofErr,       setProofErr]       = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [view,           setView]           = useState(() => initialPrefill ? "form" : "queue");
  const [editing,        setEditing]        = useState(() => initialPrefill ? { _prefill: true, ...initialPrefill } : null);
  const [viewing,        setViewing]        = useState(null);
  const [quickAssigning, setQuickAssigning] = useState(null);
  const [showArchived,   setShowArchived]   = useState(false);
  const [syncWarning,    setSyncWarning]    = useState(null);

  // ── Boot: load data from Supabase ──────────────────────────
  useEffect(() => {
    async function boot() {
      // Load proofreaders
      const { data: prs, error: pErr, source } = await fetchProofreaders();
      if (source === "offline") {
        setProofreaders(FALLBACK_PROOFREADERS.map((name, i) => ({ id: String(i), name, email: "" })));
      } else if (source === "empty" || source === "error") {
        setProofErr(source === "empty"
          ? "No proofreaders found. Add people with Department = 'Proof' in PulseX Team Settings."
          : "Could not load proofreaders from database.");
        setProofreaders([]);
      } else {
        setProofreaders(prs);
      }

      // Load requests
      if (DB_READY) {
        const { data: reqs } = await fetchRequestsFiltered(false);
        if (reqs && reqs.length > 0) setRequests(reqs);
      }

      // Look up current user's real name — first try the proofreader list, then fetch directly
      const myId = localStorage.getItem("planr_own_member_id");
      if (myId) {
        const inList = prs?.find(p => p.id === myId || p.teamMemberId === myId);
        const name   = inList?.name || await fetchMemberName(myId);
        if (name) {
          setCurrentUser(name);
          setCurrentUserId(myId);
        }
      }

      setLoading(false);

      // Auto-open a specific request if navigated from PulseX notification
      const openId = localStorage.getItem("proof_open_request_id");
      if (openId) {
        localStorage.removeItem("proof_open_request_id");
        // Small delay to let requests load, then find and open it
        setTimeout(() => {
          setViewing(openId);
        }, 400);
      }
    }
    boot();
  }, []);

  // ── Save new / edit existing ────────────────────────────────
  async function handleSave(form) {
    const isNew = !form.id || form._prefill;
    const tempId = "tmp_" + Date.now();
    const record = {
      ...form,
      id:         isNew ? tempId : form.id,
      _isNew:     isNew,
      updated_by: currentUser,
      ...(isNew ? { created_at: todayStr(), created_by: currentUser, is_archived: false } : {}),
    };
    setRequests(rs => isNew ? [record, ...rs] : rs.map(r => r.id === record.id ? record : r));
    setEditing(null);
    setView("queue");
    if (DB_READY) {
      const { data: saved, error } = await saveRequest(record);
      if (error) {
        console.error("[ProofQueue] save error:", error.message);
      } else if (saved?.id && saved.id !== tempId) {
        // Replace the temp placeholder ID with the real DB-assigned ID
        setRequests(rs => rs.map(r => r.id === tempId ? saved : r));
      }
    }
  }

  // ── Status change + completion sync ────────────────────────
  async function handleStatusChange(id, status) {
    const req = requests.find(r => r.id === id);
    const completed_at = status === "Complete" ? new Date().toISOString() : (req?.completed_at || undefined);
    const fields = {
      status,
      status_changed_by: currentUser,
      updated_by:        currentUser,
      ...(status === "Complete" ? { completed_at } : {}),
    };
    setRequests(rs => rs.map(r => r.id === id ? { ...r, ...fields } : r));
    setViewing(v => v?.id === id ? { ...v, ...fields } : v);
    if (DB_READY) {
      console.log("[ProofQueue] Saving status change:", id, "→", status);
      const { error } = await updateRequest(id, fields);
      if (error) {
        console.error("[ProofQueue] Status save FAILED:", error);
        setSyncWarning(`Status change to "${status}" could not be saved — check console for details.`);
      } else {
        console.log("[ProofQueue] Status saved ✓");
      }
    } else {
      console.warn("[ProofQueue] DB not ready — status change is local only, will revert on refresh");
    }

    // On completion: sync PulseX task + store notification in localStorage for PulseX to pick up
    if (status === "Complete") {
      setSyncWarning(null);

      // 1. Sync linked PulseX task
      if (req?.related_task_id) {
        const { error: syncErr } = await markPulseXTaskDone(req.related_task_id, null);
        if (syncErr) {
          setSyncWarning("Proof request completed, but the linked timeline task could not be updated.");
          console.warn("[ProofIntegration] completion sync failed:", syncErr);
        }
      }

      // 2. Store notification in localStorage — PulseX reads this when the tab becomes active.
      //    This avoids cross-tab auth/RLS issues with direct DB inserts.
      const recipientId = req?.submitted_by_member_id
        || await findMemberIdByName(req?.submitted_by || "");

      if (recipientId) {
        const notif = {
          id:                 `notif_proof_${Date.now()}_${recipientId}`,
          type:               "task_completed",
          message:            `Proofing complete for "${req?.project_name || "Proof Request"}" (${req?.client || ""}).`,
          assignedToPersonId: recipientId,
          taskId:             req?.related_task_id || null,
          createdAt:          new Date().toISOString(),
          isRead:             false,
        };
        try {
          const existing = JSON.parse(localStorage.getItem("proof_pending_notifications") || "[]");
          existing.push(notif);
          localStorage.setItem("proof_pending_notifications", JSON.stringify(existing));
          console.log("[ProofQueue] ✓ Notification queued for member:", recipientId);
        } catch (e) {
          console.error("[ProofQueue] Could not queue notification:", e.message);
        }
      } else {
        console.warn("[ProofQueue] No recipient found for submitted_by:", req?.submitted_by, "— notification skipped");
      }
    }
  }

  // ── Assign ─────────────────────────────────────────────────
  async function handleAssign(id, proofreaderName, proofreaderIdUUID) {
    const pr = proofreaders.find(p => p.name === proofreaderName);
    const fields = {
      assigned_proofreader:    proofreaderName,
      assigned_proofreader_id: proofreaderIdUUID || pr?.id || null,
      assigned_member_id:      pr?.teamMemberId  || null,
      status:                  "Assigned",
      assigned_by:             currentUser,
      status_changed_by:       currentUser,
      updated_by:              currentUser,
    };
    setRequests(rs => rs.map(r => r.id === id ? { ...r, ...fields } : r));
    setViewing(v => v?.id === id ? { ...v, ...fields } : v);
    if (DB_READY) {
      const { error } = await updateRequest(id, fields);
      if (error) console.error("[ProofQueue] assign error:", error.message);
    }
  }

  // ── Archive ────────────────────────────────────────────────
  async function handleArchive(id) {
    // Mark archived in local state (keep the record — filter it display-side)
    const archivedFields = {
      is_archived: true,
      archived_by: currentUser,
      archived_at: new Date().toISOString(),
    };
    setRequests(rs => rs.map(r => r.id === id ? { ...r, ...archivedFields } : r));
    setViewing(null);
    if (DB_READY) {
      const { error } = await archiveRequest(id, currentUser);
      if (error) console.error("[ProofQueue] archive error:", error.message);
    }
  }

  async function handleUnarchive(id) {
    setRequests(rs => rs.map(r => r.id === id
      ? { ...r, is_archived: false, archived_at: null, archived_by: null }
      : r
    ));
    if (DB_READY) {
      const { error } = await unarchiveRequest(id);
      if (error) console.error("[ProofQueue] unarchive error:", error.message);
    }
  }

  // ── Delete ────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!window.confirm("Permanently delete this proof request? This cannot be undone.")) return;
    setRequests(rs => rs.filter(r => r.id !== id));
    setViewing(null);
    if (DB_READY) {
      const { error } = await deleteRequest(id);
      if (error) console.error("[ProofQueue] delete error:", error);
    }
  }

  // Filter for display — showArchived controls what QueueView receives
  const displayRequests = showArchived ? requests : requests.filter(r => !r.is_archived);

  const activeRequests = requests.filter(r => !r.is_archived);
  const myActive       = activeRequests.filter(r => r.assigned_proofreader === currentUser && r.status !== "Complete").length;
  const unassigned     = activeRequests.filter(r => r.status === "Submitted" && !r.assigned_proofreader).length;

  function NavBtn({ id, label, badge }) {
    const active = view === id;
    return (
      <button onClick={() => setView(id)}
        style={{ padding:"5px 10px", borderRadius:5, border:`1px solid ${active ? C.teal+"80" : "rgba(255,255,255,0.1)"}`,
          cursor:"pointer", fontFamily:C.font, fontSize:12, fontWeight:700,
          background:active?"rgba(0,181,181,0.18)":"rgba(255,255,255,0.04)",
          color:active?C.teal:"rgba(255,255,255,0.6)", flexShrink:0,
          display:"flex", flexDirection:"column", alignItems:"center", gap:1, minWidth:52,
          letterSpacing:"0.02em" }}>
        {label}
        {badge > 0 && <span style={{ marginLeft:6, fontSize:10, background:"rgba(255,255,255,0.25)", borderRadius:8, padding:"1px 5px" }}>{badge}</span>}
      </button>
    );
  }

  // ── Form screen (new request OR editing OR pre-filled from PulseX) ──
  if (editing !== null || view === "form") {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:'"Roboto", Arial, sans-serif' }}>
        {editing?._prefill && (
          <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:"#002A4E", color:"#50C0C0", borderRadius:8, padding:"8px 18px", fontSize:12, fontWeight:700, zIndex:100 }}>
            ↗ Pre-filled from PulseX — all fields are editable
          </div>
        )}
        <RequestForm
          initial={editing}
          currentUser={currentUser}
          proofreaders={proofreaders}
          proofreadersErr={proofErr}
          onSave={handleSave}
          onCancel={() => { setEditing(null); setView("queue"); }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:C.font }}>
      {/* Roboto font + global reset */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet" />
      <style>{"* { box-sizing: border-box; } body, button, input, select, textarea { font-family: 'Roboto', Arial, sans-serif; }"}</style>

      <header style={{ background:C.navy, padding:"0 10px", height:62, display:"flex", alignItems:"center", gap:10, position:"sticky", top:0, zIndex:100, borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:8 }}>
          <div style={{ width:30, height:30, borderRadius:6, background:C.teal, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ fontSize:11, fontWeight:900, color:C.navy, fontFamily:'"Roboto", Arial, sans-serif' }}>PX</span>
          </div>
          <span style={{ fontSize:14, fontWeight:800, color:"#fff", letterSpacing:"-0.01em" }}>Proof Queue</span>
        </div>
        <nav style={{ display:"flex", gap:2 }}>
          <NavBtn id="queue"   label="Queue"    badge={unassigned} />
          <NavBtn id="myqueue" label="My Queue" badge={myActive}   />
          <NavBtn id="reports" label="Reports"  badge={0}          />
        </nav>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={() => setShowArchived(a => !a)}
            style={{ fontSize:11, fontWeight:600, padding:"5px 12px", background:showArchived?"rgba(245,158,11,0.2)":"rgba(255,255,255,0.1)", color:showArchived?"#fbbf24":"#ffffff", border:"1px solid rgba(255,255,255,0.25)", borderRadius:6, cursor:"pointer", fontFamily:"inherit" }}>
            {showArchived ? "📦 Hide Archived" : "📦 Archived"}
          </button>
          <button onClick={() => {
            if (window.opener && !window.opener.closed) { window.opener.focus(); window.close(); }
            else { window.location.href = "/"; }
          }}
            style={{ padding:"5px 12px", background:"rgba(255,255,255,0.1)", color:"#ffffff",
              border:"1px solid rgba(255,255,255,0.25)", borderRadius:6, cursor:"pointer",
              fontSize:12, fontWeight:700, fontFamily:C.font }}>
            ← PulseX
          </button>
          <button onClick={() => { setEditing(null); setView("form"); }}
            style={{ padding:"5px 14px", background:"rgba(0,181,181,0.2)", color:"#00E5E5",
              border:"1px solid rgba(0,181,181,0.6)", borderRadius:6, cursor:"pointer",
              fontSize:13, fontWeight:800, fontFamily:C.font, display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ fontSize:15, lineHeight:1 }}>+</span> New Request
          </button>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)", borderLeft:"1px solid rgba(255,255,255,0.1)", paddingLeft:14 }}>
            👤 {currentUser}
          </span>
        </div>
      </header>

      {/* Page title */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, padding:"10px 24px" }}>
        <h1 style={{ margin:0, fontSize:15, fontWeight:800, color:C.navy }}>{{ queue:"Proof Queue", myqueue:"My Queue", reports:"Reports" }[view]}</h1>
        <p style={{ margin:"2px 0 0", fontSize:12, color:C.muted }}>
          {{ queue:`${activeRequests.filter(r=>r.status!=="Complete").length} open · ${unassigned} awaiting assignment${showArchived?" · showing archived":""}`, myqueue:`Logged in as ${currentUser}`, reports:"Prototype metrics" }[view]}
        </p>
      </div>

      {syncWarning && (
        <div style={{ background:"#fef3c7", borderBottom:"1px solid #f59e0b40", padding:"10px 24px", fontSize:12, color:"#92400e", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          ⚠ {syncWarning}
          <button onClick={() => setSyncWarning(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#92400e", fontFamily:"inherit" }}>✕</button>
        </div>
      )}

      {proofErr && (
        <div style={{ background:"#fff7ed", borderBottom:"1px solid #fed7aa", padding:"8px 24px", fontSize:12, color:"#9a3412" }}>
          ⚠ {proofErr}
        </div>
      )}

      {loading && <div style={{ padding:40, textAlign:"center", color:C.muted, fontSize:14 }}>Loading…</div>}

      {!loading && (
        <main style={{ padding:24 }}>
          {view==="queue"   && <QueueView   requests={displayRequests} proofreaders={proofreaders} showArchived={showArchived} onView={setViewing} onEdit={r=>setEditing(r)} onQuickAssign={setQuickAssigning} onArchive={handleArchive} onUnarchive={handleUnarchive} onDelete={handleDelete} />}
          {view==="myqueue" && <MyQueueView requests={displayRequests.filter(r=>!r.is_archived)} currentUser={currentUser} currentUserId={currentUserId} onView={setViewing} onEdit={r=>setEditing(r)} />}
          {view==="reports" && <ReportsView requests={requests} proofreaders={proofreaders} showArchived={showArchived} />}
        </main>
      )}

      {viewing && (
        <DetailModal req={viewing} currentUser={currentUser} proofreaders={proofreaders} proofreadersErr={proofErr}
          onClose={()=>setViewing(null)} onEdit={r=>{ setViewing(null); setEditing(r); }}
          onStatusChange={handleStatusChange} onAssign={handleAssign}
          onArchive={handleArchive} onUnarchive={handleUnarchive} onDelete={handleDelete} />
      )}
      {quickAssigning && (
        <AssignModal req={quickAssigning} currentUser={currentUser} proofreaders={proofreaders} proofreadersErr={proofErr}
          onCancel={()=>setQuickAssigning(null)}
          onAssign={(name, id) => { handleAssign(quickAssigning.id, name, id); setQuickAssigning(null); }} />
      )}
    </div>
  );
}
