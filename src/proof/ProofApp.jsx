// @ts-nocheck
// ============================================================
// ProofApp.jsx — Root component for the Proof Queue prototype
// Route: /proof  (add to main.jsx — see bottom of file)
// ============================================================
import React, { useState, useEffect } from "react";
import { PROOF_COLORS as C, PROOFREADERS as FALLBACK_PROOFREADERS, todayStr } from "./lib/proofTypes";
import { fetchRequests, saveRequest, updateRequest, fetchProofreaders, DB_READY } from "./lib/proofDb";

import QueueView    from "./components/QueueView";
import MyQueueView  from "./components/MyQueueView";
import ReportsView  from "./components/ReportsView";
import RequestForm  from "./components/RequestForm";
import DetailModal  from "./components/DetailModal";
import AssignModal  from "./components/AssignModal";

// ── Seed data (used when DB is not configured) ────────────────
const SEED = [
  { id:"pr1", client:"Acme Corp",    project_name:"Q3 Newsletter",       project_number:"23-041", task_number:"T-12", request_type:"Full Read",       priority:"High",   department:"Editorial",       due_date:"2026-06-10", submitted_by:"Maya Chen",     assigned_proofreader:"Sam Torres",   status:"In Review", instructions:"Check tone for exec audience.",  sharepoint_link:"https://sharepoint.com/acme/q3",     created_at:"2026-06-01", created_by:"Maya Chen",    status_changed_by:"Jordan Rivers", assigned_by:"Maya Chen" },
  { id:"pr2", client:"Globex",       project_name:"Product Brochure",    project_number:"23-042", task_number:"T-07", request_type:"Check Changes",    priority:"Urgent", department:"Design",          due_date:"2026-06-06", submitted_by:"Jordan Rivers", assigned_proofreader:"Riley Park",    status:"Assigned",  instructions:"Only section 2 changed.",        sharepoint_link:"https://sharepoint.com/globex",      created_at:"2026-06-02", created_by:"Jordan Rivers",status_changed_by:"Admin",         assigned_by:"Admin" },
  { id:"pr3", client:"Initech",      project_name:"Annual Report",       project_number:"23-039", task_number:"T-03", request_type:"Style Guide Check",priority:"Medium", department:"Editorial",       due_date:"2026-06-12", submitted_by:"Riley Park",   assigned_proofreader:null,            status:"Submitted", instructions:"Full style guide compliance.",   sharepoint_link:"",                                    created_at:"2026-06-03", created_by:"Riley Park"  },
  { id:"pr4", client:"Umbrella Inc", project_name:"Email Campaign #5",   project_number:"23-044", task_number:"T-21", request_type:"Grammar Only",     priority:"Low",    department:"Editorial",       due_date:"2026-06-15", submitted_by:"Alex Kim",      assigned_proofreader:"Sam Torres",   status:"Assigned",  instructions:"",                               sharepoint_link:"https://sharepoint.com/umbrella",     created_at:"2026-06-03", created_by:"Alex Kim",     status_changed_by:"Admin",         assigned_by:"Admin" },
  { id:"pr5", client:"Acme Corp",    project_name:"Social Media Pack",   project_number:"23-041", task_number:"T-14", request_type:"Full Read",        priority:"Medium", department:"Strategy",        due_date:"2026-05-30", submitted_by:"Maya Chen",     assigned_proofreader:"Jordan Rivers", status:"Complete",  instructions:"Instagram + LinkedIn copy.",     sharepoint_link:"https://sharepoint.com/acme/social", created_at:"2026-05-28", created_by:"Maya Chen",    status_changed_by:"Jordan Rivers", assigned_by:"Maya Chen",   completed_at:"2026-06-01" },
  { id:"pr6", client:"Soylent",      project_name:"Website Refresh Copy",project_number:"23-047", task_number:"T-01", request_type:"Full Read",        priority:"High",   department:"Client Services", due_date:"2026-06-08", submitted_by:"Jordan Rivers", assigned_proofreader:"Alex Kim",      status:"In Review", instructions:"Homepage and About us.",         sharepoint_link:"https://sharepoint.com/soylent",      created_at:"2026-06-04", created_by:"Jordan Rivers",status_changed_by:"Alex Kim",      assigned_by:"Jordan Rivers" },
  { id:"pr7", client:"Globex",       project_name:"White Paper",         project_number:"23-043", task_number:"T-09", request_type:"Style Guide Check",priority:"Medium", department:"",               due_date:"2026-06-18", submitted_by:"Sam Torres",   assigned_proofreader:null,            status:"Submitted", instructions:"Technical B2B content.",         sharepoint_link:"",                                    created_at:"2026-06-04", created_by:"Sam Torres"  },
];

// Current user — replace with real auth when merging into PulseX
const CURRENT_USER = "Sam Torres";

export default function ProofApp() {
  const [requests,        setRequests]        = useState(SEED);
  const [proofreaders,    setProofreaders]     = useState([]);   // {id, name, email}
  const [proofreadersErr, setProofreadersErr]  = useState(null); // error message or null
  const [loading,         setLoading]          = useState(true);
  const [view,            setView]             = useState("queue");
  const [editing,         setEditing]          = useState(null);
  const [viewing,         setViewing]          = useState(null);
  const [quickAssigning,  setQuickAssigning]   = useState(null);

  // ── Boot: load requests + proofreaders ───────────────────────
  useEffect(() => {
    async function boot() {
      // Load proofreaders first (small table, fast)
      const { data: prs, error: pErr, source } = await fetchProofreaders();
      if (source === "offline") {
        // DB not configured — use fallback names so dropdowns work in demo
        setProofreaders(FALLBACK_PROOFREADERS.map((name, i) => ({ id: String(i), name, email: "" })));
      } else if (pErr || prs.length === 0) {
        setProofreadersErr("Could not load proofreaders from database. Check that the proofreaders table exists and has active rows.");
        setProofreaders([]);
      } else {
        setProofreaders(prs);
      }

      // Load requests
      if (DB_READY) {
        const { data: reqs, error: rErr } = await fetchRequests();
        if (!rErr && reqs.length > 0) setRequests(reqs);
      }

      setLoading(false);
    }
    boot();
  }, []);

  // ── Handlers ─────────────────────────────────────────────────
  async function handleSave(form) {
    const isNew  = !form.id;
    const record = {
      ...form,
      id:         form.id || ("pr_" + Date.now()),
      updated_by: CURRENT_USER,
      ...(isNew ? { created_at: todayStr(), created_by: CURRENT_USER } : {}),
    };
    setRequests(rs => isNew ? [record, ...rs] : rs.map(r => r.id === record.id ? record : r));
    setEditing(null);
    setView("queue");
    if (DB_READY) {
      const { error } = await saveRequest(record);
      if (error) console.error("[ProofQueue] save error:", error.message);
    }
  }

  async function handleStatusChange(id, status) {
    const completed_at = status === "Complete" ? new Date().toISOString() : undefined;
    const fields = { status, status_changed_by: CURRENT_USER, updated_by: CURRENT_USER, ...(completed_at ? { completed_at } : {}) };
    setRequests(rs => rs.map(r => r.id === id ? { ...r, ...fields } : r));
    setViewing(v => v && v.id === id ? { ...v, ...fields } : v);
    if (DB_READY) {
      const { error } = await updateRequest(id, fields);
      if (error) console.error("[ProofQueue] status update error:", error.message);
    }
  }

  async function handleAssign(id, proofreaderName, proofreaderIdUUID) {
    const pr = proofreaders.find(p => p.name === proofreaderName);
    const fields = {
      assigned_proofreader:    proofreaderName,
      assigned_proofreader_id: proofreaderIdUUID || pr?.id || null,
      status:                  "Assigned",
      assigned_by:             CURRENT_USER,
      status_changed_by:       CURRENT_USER,
      updated_by:              CURRENT_USER,
    };
    setRequests(rs => rs.map(r => r.id === id ? { ...r, ...fields } : r));
    setViewing(v => v && v.id === id ? { ...v, ...fields } : v);
    if (DB_READY) {
      const { error } = await updateRequest(id, fields);
      if (error) console.error("[ProofQueue] assign error:", error.message);
    }
  }

  // ── Derived counts ────────────────────────────────────────────
  const myActive   = requests.filter(r => r.assigned_proofreader === CURRENT_USER && r.status !== "Complete").length;
  const unassigned = requests.filter(r => r.status === "Submitted" && !r.assigned_proofreader).length;

  // ── Nav button ────────────────────────────────────────────────
  function NavBtn({ id, label, badge }) {
    const active = view === id;
    return (
      <button
        onClick={() => setView(id)}
        style={{ padding:"8px 14px", borderRadius:6, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600, background:active?C.teal:"none", color:active?"#fff":"rgba(255,255,255,0.65)", transition:"background 0.15s,color 0.15s" }}
      >
        {label}
        {badge > 0 && (
          <span style={{ marginLeft:6, fontSize:10, background:"rgba(255,255,255,0.25)", borderRadius:8, padding:"1px 5px" }}>{badge}</span>
        )}
      </button>
    );
  }

  // ── Form screen ───────────────────────────────────────────────
  if (editing !== null || view === "form") {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"system-ui,sans-serif" }}>
        <RequestForm
          initial={editing}
          currentUser={CURRENT_USER}
          proofreaders={proofreaders}
          proofreadersErr={proofreadersErr}
          onSave={handleSave}
          onCancel={() => { setEditing(null); setView("queue"); }}
        />
      </div>
    );
  }

  const pageTitles = { queue:"Proof Queue", myqueue:"My Queue", reports:"Reports" };
  const pageSubs   = {
    queue:   `${requests.filter(r=>r.status!=="Complete").length} open · ${unassigned} awaiting assignment`,
    myqueue: `Logged in as ${CURRENT_USER}`,
    reports: "Prototype metrics",
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"system-ui,sans-serif" }}>
      {/* Header */}
      <header style={{ background:C.navy, padding:"0 24px", height:56, display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:8 }}>
          <div style={{ width:30, height:30, borderRadius:6, background:C.teal, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:11, fontWeight:900, color:"#fff" }}>PQ</span>
          </div>
          <span style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Proof Queue</span>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.4)", background:"rgba(255,255,255,0.08)", borderRadius:4, padding:"2px 6px" }}>PROTOTYPE</span>
        </div>
        <nav style={{ display:"flex", gap:2 }}>
          <NavBtn id="queue"   label="Queue"    badge={unassigned} />
          <NavBtn id="myqueue" label="My Queue" badge={myActive}   />
          <NavBtn id="reports" label="Reports"  badge={0}          />
        </nav>
        <button
          onClick={() => { setEditing(null); setView("form"); }}
          style={{ marginLeft:"auto", padding:"7px 16px", background:C.teal, color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}
        >
          + New Request
        </button>
        <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)", borderLeft:"1px solid rgba(255,255,255,0.1)", paddingLeft:14 }}>
          👤 {CURRENT_USER}
        </span>
      </header>

      {/* Page title */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, padding:"10px 24px" }}>
        <h1 style={{ margin:0, fontSize:15, fontWeight:800, color:C.navy }}>{pageTitles[view]}</h1>
        <p style={{ margin:"2px 0 0", fontSize:12, color:C.muted }}>{pageSubs[view]}</p>
      </div>

      {loading && (
        <div style={{ padding:40, textAlign:"center", color:C.muted, fontSize:14 }}>Loading…</div>
      )}

      {!loading && (
        <main style={{ padding:24 }}>
          {view==="queue"   && <QueueView   requests={requests} proofreaders={proofreaders} onView={setViewing} onEdit={r=>setEditing(r)} onQuickAssign={setQuickAssigning} />}
          {view==="myqueue" && <MyQueueView requests={requests} currentUser={CURRENT_USER} onView={setViewing} onEdit={r=>setEditing(r)} />}
          {view==="reports" && <ReportsView requests={requests} proofreaders={proofreaders} />}
        </main>
      )}

      {viewing && (
        <DetailModal req={viewing} currentUser={CURRENT_USER} proofreaders={proofreaders} proofreadersErr={proofreadersErr}
          onClose={()=>setViewing(null)} onEdit={r=>{ setViewing(null); setEditing(r); }}
          onStatusChange={handleStatusChange} onAssign={handleAssign} />
      )}
      {quickAssigning && (
        <AssignModal req={quickAssigning} currentUser={CURRENT_USER} proofreaders={proofreaders} proofreadersErr={proofreadersErr}
          onCancel={()=>setQuickAssigning(null)}
          onAssign={(name, id) => { handleAssign(quickAssigning.id, name, id); setQuickAssigning(null); }} />
      )}
    </div>
  );
}

/*
── Add to src/main.jsx ──────────────────────────────────────────

import { BrowserRouter, Routes, Route } from "react-router-dom";
import App      from "./App.jsx";
import ProofApp from "./proof/ProofApp.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/proof/*" element={<ProofApp />} />
      <Route path="/*"       element={<App />} />
    </Routes>
  </BrowserRouter>
);
*/
