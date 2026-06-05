import React, { useState, useMemo } from "react";
import { PROOF_COLORS as C, STATUS_META, STATUSES, REQUEST_TYPES, PRIORITIES, DEPARTMENTS, PROOFREADERS } from "../lib/proofTypes";
import RequestCard from "./RequestCard";

export default function QueueView({ requests, onView, onEdit, onQuickAssign }) {
  const [filter, setFilter] = useState({ search: "", type: "", proofreader: "", priority: "", dept: "" });
  const sf = (k, v) => setFilter(f => ({ ...f, [k]: v }));

  const sel = {
    padding: "6px 10px", border: `1px solid ${C.border}`,
    borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: C.card,
  };

  const filtered = useMemo(() => {
    let r = requests;
    if (filter.search)      r = r.filter(x => (x.project_name + x.client + x.project_number).toLowerCase().includes(filter.search.toLowerCase()));
    if (filter.type)        r = r.filter(x => x.request_type === filter.type);
    if (filter.proofreader) r = r.filter(x => x.assigned_proofreader === filter.proofreader);
    if (filter.priority)    r = r.filter(x => x.priority === filter.priority);
    if (filter.dept)        r = r.filter(x => x.department === filter.dept);
    return r;
  }, [requests, filter]);

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
        <input
          value={filter.search}
          onChange={e => sf("search", e.target.value)}
          placeholder="Search projects, clients..."
          style={{ ...sel, width: 200 }}
        />
        <select style={sel} value={filter.dept}        onChange={e => sf("dept", e.target.value)}>
          <option value="">All Depts</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select style={sel} value={filter.type}        onChange={e => sf("type", e.target.value)}>
          <option value="">All Types</option>
          {REQUEST_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select style={sel} value={filter.proofreader} onChange={e => sf("proofreader", e.target.value)}>
          <option value="">All Proofreaders</option>
          {PROOFREADERS.map(p => <option key={p}>{p}</option>)}
        </select>
        <select style={sel} value={filter.priority}    onChange={e => sf("priority", e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
          {filtered.length} request{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Kanban columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {STATUSES.map(status => {
          const mm    = STATUS_META[status];
          const items = filtered.filter(r => r.status === status);
          return (
            <div key={status}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${mm.color}` }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: mm.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {status}
                </span>
                <span style={{ fontSize: 11, color: mm.color, background: mm.bg, borderRadius: 10, padding: "1px 8px", fontWeight: 700 }}>
                  {items.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "20px 0", border: `1px dashed ${C.border}`, borderRadius: 8 }}>
                    No requests
                  </div>
                ) : (
                  items.map(r => (
                    <RequestCard key={r.id} req={r} onView={onView} onEdit={onEdit} onQuickAssign={onQuickAssign} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
