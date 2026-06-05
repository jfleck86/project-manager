import React from "react";
import {
  PROOF_COLORS as C,
  STATUS_META, DEPT_META, STATUSES, DEPARTMENTS, REQUEST_TYPES, PROOFREADERS,
  todayStr, thisMonth, isOverdue, fmtDate,
} from "../lib/proofTypes";
import MetricsCard from "./MetricsCard";

function BarChart({ title, data, colorFn }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 14 }}>{title}</div>
      {entries.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No data</div>}
      {entries.map(([k, v]) => {
        const barColor = colorFn ? colorFn(k) : C.teal;
        return (
          <div key={k} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
                {colorFn && (
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: barColor, display: "inline-block", flexShrink: 0 }} />
                )}
                {k || "—"}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>{v}</span>
            </div>
            <div style={{ background: "#f1f5f9", borderRadius: 4, height: 8 }}>
              <div style={{ background: barColor, borderRadius: 4, height: 8, width: `${(v / max) * 100}%`, transition: "width 0.3s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportsView({ requests }) {
  const today     = todayStr();
  const month     = thisMonth();
  const open      = requests.filter(r => r.status !== "Complete");
  const done      = requests.filter(r => r.status === "Complete");
  const overdue   = requests.filter(r => isOverdue(r.due_date, r.status));
  const monthDone = done.filter(r => r.completed_at && r.completed_at.startsWith(month));

  const avgTurnaround = (() => {
    const comp = done.filter(r => r.completed_at && r.created_at);
    if (!comp.length) return "—";
    const avg = comp.reduce((s, r) => s + (new Date(r.completed_at) - new Date(r.created_at)), 0) / comp.length;
    return Math.round(avg / 86400000) + " days";
  })();

  const completionRate = requests.length
    ? Math.round((done.length / requests.length) * 100) + "%"
    : "—";

  const unassigned = requests.filter(r => !r.assigned_proofreader && r.status === "Submitted").length;

  // Chart data
  const byStatus      = STATUSES.reduce((a, s) => ({ ...a, [s]: requests.filter(r => r.status === s).length }), {});
  const byDept        = [...DEPARTMENTS, "(None)"].reduce((a, d) => ({ ...a, [d]: requests.filter(r => (r.department || "(None)") === d).length }), {});
  const byProofreader = PROOFREADERS.reduce((a, p) => ({ ...a, [p]: open.filter(r => r.assigned_proofreader === p).length }), {});
  const byType        = REQUEST_TYPES.reduce((a, t) => ({ ...a, [t]: requests.filter(r => r.request_type === t).length }), {});
  const byClient      = requests.reduce((a, r) => ({ ...a, [r.client]: (a[r.client] || 0) + 1 }), {});

  const statusColor = s => STATUS_META[s]?.color || "#94a3b8";
  const deptColor   = d => DEPT_META[d]?.color   || "#94a3b8";

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        <MetricsCard label="Total Requests"   value={requests.length}  color={C.navy}     />
        <MetricsCard label="Open"             value={open.length}      color={C.teal}     />
        <MetricsCard label="Completed"        value={done.length}      color="#10b981"    />
        <MetricsCard label="Overdue"          value={overdue.length}   color="#ef4444"    sub={overdue.length > 0 ? "Needs attention" : ""} />
        <MetricsCard label="Done This Month"  value={monthDone.length} color="#8b5cf6"    />
      </div>

      {/* Performance cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <MetricsCard label="Avg Turnaround"    value={avgTurnaround}   color="#f59e0b" />
        <MetricsCard label="Unassigned"        value={unassigned}      color="#f97316" sub="Submitted, no proofreader" />
        <MetricsCard label="Completion Rate"   value={completionRate}  color="#10b981" />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <BarChart title="Requests by Status"     data={byStatus} colorFn={statusColor} />
        <BarChart title="Requests by Department" data={byDept}   colorFn={deptColor}   />
      </div>

      {/* Charts row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <BarChart title="Open by Proofreader" data={byProofreader} />
        <BarChart title="Requests by Type"    data={byType}        />
        <BarChart title="Requests by Client"  data={byClient}      />
      </div>
    </div>
  );
}