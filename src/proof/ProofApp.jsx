// @ts-nocheck
// ============================================================
// ProofApp.jsx — Root component for the Proof Queue prototype
// Route: /proof  (add to main.jsx — see comment at bottom)
// Completely isolated from PulseX. Uses proof_* tables only.
// ============================================================
import React, { useState, useEffect } from "react";
import { PROOF_COLORS as C, PROOFREADER_DEPT, todayStr } from "./lib/proofTypes";
import { fetchRequests, saveRequest, updateRequest, DB_READY } from "./lib/proofDb";

import QueueView    from "./components/QueueView";
import MyQueueView  from "./components/MyQueueView";
import ReportsView  from "./components/ReportsView";
import RequestForm  from "./components/RequestForm";
import DetailModal  from "./components/DetailModal";
import AssignModal  from "./components/AssignModal";

// ── Seed data (used when DB is not configured) ────────────────
const SEED = [
  { id:"pr1", client:"Acme Corp",    project_name:"Q3 Newsletter",       project_number:"23-041", task_number:"T-12", request_type:"Full Read",       priority:"High",   department:"Editorial",       due_date:"2026-06-10", submitted_by:"Maya Chen",     assigned_proofreader:"Sam Torres",   status:"In Review", instructions:"Check tone for exec audience.",  sharepoint_link:"https://sharepoint.com/acme/q3",     created_at:"2026-06-01", created_by:"Maya Chen",    updated_by:"Maya Chen",    status_changed_by:"Jordan Rivers", assigned_by:"Maya Chen" },
  { id:"pr2", client:"Globex",       project_name:"Product Brochure",    project_number:"23-042", task_number:"T-07", request_type:"Check Changes",    priority:"Urgent", department:"Design",          due_date:"2026-06-06", submitted_by:"Jordan Rivers", assigned_proofreader:"Riley Park",    status:"Assigned",  instructions:"Only section 2 changed.",        sharepoint_link:"https://sharepoint.com/globex",      created_at:"2026-06-02", created_by:"Jordan Rivers",updated_by:"Jordan Rivers",status_changed_by:"Admin",         assigned_by:"Admin" },
  { id:"pr3", client:"Initech",      project_name:"Annual Report",       project_number:"23-039", task_number:"T-03", request_type:"Style Guide Check",priority:"Medium", department:"Editorial",       due_date:"2026-06-12", submitted_by:"Riley Park",   assigned_proofreader:null,            status:"Submitted", instructions:"Full style guide compliance.",   sharepoint_link:"",                                    created_at:"2026-06-03", created_by:"Riley Park",   updated_by:"Riley Park",   status_changed_by:null,            assigned_by:null },
  { id:"pr4", client:"Umbrella Inc", project_name:"Email Campaign #5",   project_number:"23-044", task_number:"T-21", request_type:"Grammar Only",     priority:"Low",    department:"Editorial",       due_date:"2026-06-15", submitted_by:"Alex Kim",      assigned_proofreader:"Sam Torres",   status:"Assigned",  instructions:"",                               sharepoint_link:"https://sharepoint.com/umbrella",     created_at:"2026-06-03", created_by:"Alex Kim",     updated_by:"Alex Kim",     status_changed_by:"Admin",         assigned_by:"Admin" },
  { id:"pr5", client:"Acme Corp",    project_name:"Social Media Pack",   project_number:"23-041", task_number:"T-14", request_type:"Full Read",        priority:"Medium", department:"Strategy",        due_date:"2026-05-30", submitted_by:"Maya Chen",     assigned_proofreader:"Jordan Rivers", status:"Complete",  instructions:"Instagram + LinkedIn copy.",     sharepoint_link:"https://sharepoint.com/acme/social", created_at:"2026-05-28", created_by:"Maya Chen",   updated_by:"Jordan Rivers",status_changed_by:"Jordan Rivers", assigned_by:"Maya Chen", completed_at:"2026-06-01" },
  { id:"pr6", client:"Soylent",      project_name:"Website Refresh Copy",project_number:"23-047", task_number:"T-01", request_type:"Full Read",        priority:"High",   department:"Client Services", due_date:"2026-06-08", submitted_by:"Jordan Rivers", assigned_proofreader:"Alex Kim",      status:"In Review", instructions:"Homepage and About us.",         sharepoint_link:"https://sharepoint.com/soylent",      created_at:"2026-06-04", created_by:"Jordan Rivers",updated_by:"Alex Kim",     status_changed_by:"Alex Kim",      assigned_by:"Jordan Rivers" },
  { id:"pr7", client:"Globex",       project_name:"White Paper",         project_number:"23-043", task_number:"T-09", request_type:"Style Guide Check",priority:"Medium", department:"",               due_date:"2026-06-18", submitted_by:"Sam Torres",   assigned_proofreader:null,            status:"Submitted", instructions:"Technical B2B content.",         sharepoint_link:"",                                    created_at:"2026-06-04", created_by:"Sam Torres",   updated_by:"Sam Torres",   status_changed_by:null,            assigned_by:null },
];

// ── Current user — replace with real auth when merging into PulseX ──
const CURRENT_USER = "Sam Torres";

export default function ProofApp() {
  const [requests,       setRequests]       = useState(SEED);
  const [loading,        setLoading]        = useState(DB_READY);
  const [view,           setView]           = useState("queue");
  const [editing,        setEditing]        = useState(null);   // null = not editing; object = editing/creating
  const [viewing,        setViewing]        = useState(null);
  const [quickAssigning, setQuickAssigning] = useState(null);

  // ── Load from Supabase if configured ────────────────────────
  useEffect(() => {
    if (!DB_READY) { setLoading(false); return; }
    fetchRequests().then(({ data, error }) => {
      if (!error && data.length > 0) setRequests(data);
      setLoading(false);
    });
  }, []);

  // ── Handlers ─────────────────────────────────────────────────
  async function handleSave(form) {
    const now = new Date().toISOString();
    const isNew = !form.id;
    const record = {
      ...form,
      id:         form.id || ("pr_" + Date.now()),
      updated_by: CURRENT_USER,
      ...(isNew ? { created_at: todayStr(), created_by: CURRENT_USER } : {}),
    };

    // Optimistic update
    setRequests(rs =>
      isNew
        ? [record, ...rs]
        : rs.map(r => r.id === record.id ? record : r)
    );
    setEditing(null);
    setView("queue");

    // Persist
    if (DB_READY) {
      const { error } = await saveRequest(record);
      if (error) console.error("[ProofQueue] save failed:", error);
    }
  }

  async function handleStatusChange(id, status) {
    const completed_at = status === "Complete" ? new Date().toISOString() : undefined;
    const fields = {
      status,
      status_changed_by: CURRENT_USER,
      updated_by:        CURRENT_USER,
      ...(completed_at ? { completed_at } : {}),
    };

    setRequests(rs => rs.map(r => r.id === id ? { ...r, ...fields } : r));
    setViewing(v => v && v.id === id ? { ...v, ...fields } : v);

    if (DB_READY) {
      const { error } = await updateRequest(id, fields);
      if (error) console.error("[ProofQueue] status update failed:", error);
    }
  }

  async function handleAssign(id, proofreader, department) {
    const dept   = department || PROOFREADER_DEPT[proofreader] || "";
    const fields = {
      assigned_proofreader: proofreader,
      department:           dept,
      status:               "Assigned",
      assigned_by:          CURRENT_USER,
      status_changed_by:    CURRENT_USER,
      updated_by:           CURRENT_USER,
    };

    setRequests(rs => rs.map(r => r.id === id ? { ...r, ...fields } : r));
    setViewing(v => v && v.id === id ? { ...v, ...fields } : v);

    if (DB_READY) {
      const { error } = await updateRequest(id, fields);
      if (error) console.error("[ProofQueue] assign failed:", error);
    }
  }

  // ── Nav button renderer ───────────────────────────────────────
  const myActive   = requests.filter(r => r.assigned_proofreader === CURRENT_USER && r.status !== "Complete").length;
  const unassigned = requests.filter(r => r.status === "Submitted" && !r.assigned_proofreader).length;

  function NavBtn({ id, label, badge }) {
    const active = view === id;
    return (
      <button
        onClick={() => setView(id)}
        style={{
          padding:     "8px 14px",
          borderRadius: 6,
          border:       "none",
          cursor:       "pointer",
          fontFamily:   "inherit",
          fontSize:     13,
          fontWeight:   600,
          background:   active ? C.teal : "none",
          color:        active ? "#fff" : "rgba(255,255,255,0.65)",
          transition:   "background 0.15s, color 0.15s",
        }}
      >
        {label}
        {badge > 0 && (
          <span style={{ marginLeft: 6, fontSize: 10, background: "rgba(255,255,255,0.25)", borderRadius: 8, padding: "1px 5px" }}>
            {badge}
          </span>
        )}
      </button>
    );
  }

  // ── Form screen (full-page replacement) ───────────────────────
  if (editing !== null || view === "form") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <RequestForm
          initial={editing}
          currentUser={CURRENT_USER}
          onSave={handleSave}
          onCancel={() => { setEditing(null); setView("queue"); }}
        />
      </div>
    );
  }

  const pageTitles = { queue: "Proof Queue", myqueue: "My Queue", reports: "Reports" };
  const pageSubs   = {
    queue:   `${requests.filter(r => r.status !== "Complete").length} open · ${unassigned} awaiting assignment`,
    myqueue: `Logged in as ${CURRENT_USER}`,
    reports: "Prototype metrics · v2 with department reporting",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header style={{ background: C.navy, padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 6, background: C.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: "#fff" }}>PQ</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Proof Queue</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.08)", borderRadius: 4, padding: "2px 6px" }}>
            PROTOTYPE v2
          </span>
        </div>

        <nav style={{ display: "flex", gap: 2 }}>
          <NavBtn id="queue"   label="Queue"    badge={unassigned} />
          <NavBtn id="myqueue" label="My Queue" badge={myActive}   />
          <NavBtn id="reports" label="Reports"  badge={0}          />
        </nav>

        <button
          onClick={() => { setEditing(null); setView("form"); }}
          style={{ marginLeft: "auto", padding: "7px 16px", background: C.teal, color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}
        >
          + New Request
        </button>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: 14 }}>
          👤 {CURRENT_USER}
        </span>
      </header>

      {/* ── Page title bar ── */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "10px 24px" }}>
        <h1 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.navy }}>
          {pageTitles[view] || "Proof Queue"}
        </h1>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>{pageSubs[view] || ""}</p>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: C.muted, fontSize: 14 }}>Loading…</div>
      )}

      {/* ── Main content ── */}
      {!loading && (
        <main style={{ padding: 24 }}>
          {view === "queue"   && <QueueView   requests={requests} onView={setViewing} onEdit={r => setEditing(r)} onQuickAssign={setQuickAssigning} />}
          {view === "myqueue" && <MyQueueView requests={requests} currentUser={CURRENT_USER} onView={setViewing} onEdit={r => setEditing(r)} />}
          {view === "reports" && <ReportsView requests={requests} />}
        </main>
      )}

      {/* ── Modals ── */}
      {viewing && (
        <DetailModal
          req={viewing}
          currentUser={CURRENT_USER}
          onClose={() => setViewing(null)}
          onEdit={r => { setViewing(null); setEditing(r); }}
          onStatusChange={handleStatusChange}
          onAssign={handleAssign}
        />
      )}
      {quickAssigning && (
        <AssignModal
          req={quickAssigning}
          currentUser={CURRENT_USER}
          onCancel={() => setQuickAssigning(null)}
          onAssign={(p, d) => { handleAssign(quickAssigning.id, p, d); setQuickAssigning(null); }}
        />
      )}
    </div>
  );
}

/*
  ── Add to src/main.jsx ──────────────────────────────────────

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
