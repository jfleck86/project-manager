import React, { useState, useMemo } from "react";
import { PROOF_COLORS as C, STATUS_META, STATUSES, REQUEST_TYPES, PRIORITIES } from "../lib/proofTypes";
import RequestCard from "./RequestCard";

export default function QueueView({ requests, proofreaders, showArchived, onView, onEdit, onQuickAssign, onArchive, onUnarchive }) {
  const [filter, setFilter] = useState({ search:"", type:"", proofreader:"", priority:"" });
  const [completeOpen, setCompleteOpen] = useState(false); // Complete column collapsed by default when > 10
  const sf = (k, v) => setFilter(f => ({ ...f, [k]: v }));
  const sel = { padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, fontFamily:"inherit", background:C.card };

  const filtered = useMemo(() => {
    let r = requests;
    if (filter.search)      r = r.filter(x => (x.project_name + x.client + x.project_number).toLowerCase().includes(filter.search.toLowerCase()));
    if (filter.type)        r = r.filter(x => x.request_type === filter.type);
    if (filter.proofreader) r = r.filter(x => x.assigned_proofreader === filter.proofreader);
    if (filter.priority)    r = r.filter(x => x.priority === filter.priority);
    return r;
  }, [requests, filter]);

  const assignedNames = [...new Set(requests.map(r => r.assigned_proofreader).filter(Boolean))].sort();

  const completedItems = filtered.filter(r => r.status === "Complete");
  const defaultCollapsed = completedItems.length > 10;

  // Initialize collapse state based on item count (once)
  React.useEffect(() => {
    if (defaultCollapsed) setCompleteOpen(false);
    else setCompleteOpen(true);
  }, []); // eslint-disable-line

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20, alignItems:"center" }}>
        <input value={filter.search} onChange={e=>sf("search",e.target.value)} placeholder="Search projects, clients..." style={{...sel,width:200}} />
        <select style={sel} value={filter.type} onChange={e=>sf("type",e.target.value)}>
          <option value="">All Types</option>
          {REQUEST_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <select style={sel} value={filter.proofreader} onChange={e=>sf("proofreader",e.target.value)}>
          <option value="">All Proofreaders</option>
          {assignedNames.map(n=><option key={n} value={n}>{n}</option>)}
        </select>
        <select style={sel} value={filter.priority} onChange={e=>sf("priority",e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p=><option key={p}>{p}</option>)}
        </select>
        <span style={{ fontSize:12, color:C.muted, marginLeft:"auto" }}>{filtered.length} request{filtered.length!==1?"s":""}</span>
      </div>

      {/* Kanban columns */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
        {STATUSES.map(status => {
          const mm    = STATUS_META[status];
          const items = filtered.filter(r => r.status === status && !r.is_archived);
          const isComplete = status === "Complete";
          const visible = isComplete ? (completeOpen ? items : items.slice(0, 3)) : items;

          return (
            <div key={status}>
              {/* Column header */}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, paddingBottom:8, borderBottom:`2px solid ${mm.color}` }}>
                <span style={{ fontSize:12, fontWeight:800, color:mm.color, textTransform:"uppercase", letterSpacing:"0.05em" }}>{status}</span>
                <span style={{ fontSize:11, color:mm.color, background:mm.bg, borderRadius:10, padding:"1px 8px", fontWeight:700 }}>{items.length}</span>
                {isComplete && items.length > 3 && (
                  <button onClick={() => setCompleteOpen(o => !o)}
                    style={{ marginLeft:"auto", fontSize:10, color:mm.color, background:"none", border:`1px solid ${mm.color}40`, borderRadius:4, padding:"1px 7px", cursor:"pointer", fontFamily:"inherit" }}>
                    {completeOpen ? "▲ Collapse" : "▼ Expand"}
                  </button>
                )}
              </div>

              {/* Cards */}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {items.length===0
                  ? <div style={{ fontSize:12, color:C.muted, textAlign:"center", padding:"20px 0", border:`1px dashed ${C.border}`, borderRadius:8 }}>No requests</div>
                  : visible.map(r => (
                    <RequestCard key={r.id} req={r} onView={onView} onEdit={onEdit} onQuickAssign={onQuickAssign}
                      onArchive={onArchive} onUnarchive={onUnarchive} />
                  ))}
                {isComplete && !completeOpen && items.length > 3 && (
                  <div style={{ fontSize:11, color:mm.color, textAlign:"center", padding:"6px 0", cursor:"pointer" }} onClick={() => setCompleteOpen(true)}>
                    + {items.length - 3} more — click to expand
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Archived section */}
      {showArchived && (() => {
        const archived = filtered.filter(r => r.is_archived);
        if (!archived.length) return null;
        return (
          <div style={{ marginTop:32 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#9ca3af", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              📦 Archived ({archived.length})
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
              {archived.map(r => (
                <div key={r.id} style={{ opacity:0.7 }}>
                  <RequestCard req={r} onView={onView} onEdit={null} onQuickAssign={null} onArchive={null} onUnarchive={onUnarchive} />
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
