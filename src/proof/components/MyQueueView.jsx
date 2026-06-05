import React from "react";
import { PROOF_COLORS as C, todayStr, isOverdue } from "../lib/proofTypes";
import RequestCard from "./RequestCard";

export default function MyQueueView({ requests, currentUser, onView, onEdit }) {
  const mine     = requests.filter(r => r.assigned_proofreader === currentUser);
  const overdue  = mine.filter(r => isOverdue(r.due_date, r.status));
  const dueToday = mine.filter(r => r.due_date === todayStr() && r.status !== "Complete");
  const inReview = mine.filter(r => r.status === "In Review");
  const assigned = mine.filter(r => r.status === "Assigned");
  const done     = mine
    .filter(r => r.status === "Complete")
    .sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || ""))
    .slice(0, 5);

  const noop = () => {};

  function Section({ title, items, accent }) {
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: accent }}>{title}</span>
          <span style={{ fontSize: 11, color: accent, background: accent + "18", borderRadius: 10, padding: "1px 8px", fontWeight: 700 }}>
            {items.length}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {items.map(r => (
            <RequestCard key={r.id} req={r} onView={onView} onEdit={onEdit} onQuickAssign={noop} />
          ))}
        </div>
      </div>
    );
  }

  const activeCount = mine.filter(r => r.status !== "Complete").length;

  return (
    <div>
      {/* Stats header */}
      <div style={{ background: C.navy, borderRadius: 10, padding: "16px 20px", color: "#fff", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>My Queue — {currentUser}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{activeCount} active</div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            ["Overdue",   overdue.length,  "#ef4444"],
            ["Due Today", dueToday.length, "#f59e0b"],
            ["In Review", inReview.length, "#8b5cf6"],
            ["Assigned",  assigned.length, "#3b82f6"],
          ].map(([k, v, color]) => (
            <div key={k} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color }}>{v}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{k}</div>
            </div>
          ))}
        </div>
      </div>

      <Section title="Overdue"             items={overdue}  accent="#ef4444" />
      <Section title="Due Today"           items={dueToday} accent="#f59e0b" />
      <Section title="In Review"           items={inReview} accent="#8b5cf6" />
      <Section title="Assigned"            items={assigned} accent="#3b82f6" />
      <Section title="Recently Completed"  items={done}     accent="#10b981" />

      {activeCount === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 14 }}>
          No active requests assigned to you.
        </div>
      )}
    </div>
  );
}
