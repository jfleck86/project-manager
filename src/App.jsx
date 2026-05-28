import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";

// --- PEOPLE ───────────────────────────────────────────────────────────────────
const initialPeople = [
  { id: "p1", name: "Maya Chen",     color: "#f59e0b" },
  { id: "p2", name: "Jordan Rivers", color: "#38bdf8" },
  { id: "p3", name: "Sam Torres",    color: "#a78bfa" },
  { id: "p4", name: "Riley Park",    color: "#34d399" },
  { id: "p5", name: "Alex Kim",      color: "#f87171" },
];

function getInitials(name) {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const STATUSES = ["Not Started", "In Progress", "Done", "Blocked"];
const PRIORITIES   = ["Low", "Medium", "High", "Critical"];
const DEPARTMENTS  = ["Editorial", "Design", "Proof", "Strategy", "Account", "Production", "Client Review"];
// ── BRAND COLORS ─────────────────────────────────────────────────────────────
const BRAND_TEAL   = "#50C0C0";  // primary accent
const BRAND_NAVY   = "#002A4E";  // dark background / headers
const BRAND_TEAL_D = "#009090";  // darker teal for hover / text on light bg
const BRAND_TEAL_L = "rgba(80,192,192,0.13)"; // light teal for selected bg

const EFFORT_OPTS  = ["S", "M", "L"];
const ZOOM_LEVELS  = [
  { id: "compact",  label: "Compact",    base: 11, scale: 0.85 },
  { id: "standard", label: "Standard",   base: 13, scale: 1.00 },
  { id: "large",    label: "Large",      base: 15, scale: 1.15 },
  { id: "xl",       label: "Extra Large",base: 17, scale: 1.30 },
];
// Font-size scaler — multiply any px size by the zoom ratio
// zoomRatio is set inside App() based on selected zoom level
let _zoomRatio = 1.0;
const fs = (px) => Math.round(px * _zoomRatio);
// ── CAPACITY ENGINE ──────────────────────────────────────────────────────────
// Hidden from users — only Small/Medium/Large labels are shown in UI
const EFFORT_HOURS  = { S: 1, M: 4, L: 8 };  // hours per task
const WEEKLY_HOURS  = 40;                      // standard capacity per person per week
const HOURS_LIGHT   = 20;                      // 0–20h = Light
const HOURS_MEDIUM  = 40;                      // 20–40h = Medium  (>40 = Heavy)

// Still expose EFFORT_VAL for legacy score/sort logic (uses relative units)
const EFFORT_VAL    = { S: 1, M: 4, L: 8 };  // now mirrors EFFORT_HOURS

// Centralized effort → hours
const effortHours = (e) => EFFORT_HOURS[e] || EFFORT_HOURS["M"];

// Workload classification (hours-based, hidden from users)
function classifyLoad(hoursPlanned, hoursAvailable) {
  const pct = hoursAvailable > 0 ? hoursPlanned / hoursAvailable : hoursPlanned > 0 ? 2 : 0;
  if (hoursPlanned <= HOURS_LIGHT)  return { label: "Light",    color: "#34d399", pct };
  if (hoursPlanned <= HOURS_MEDIUM) return { label: "Moderate", color: "#fbbf24", pct };
  if (hoursPlanned <= hoursAvailable + 8) return { label: "Busy",  color: "#fb923c", pct };
  return { label: "Heavy", color: "#f87171", pct };
}

// Count PTO business days in a week (Mon–Fri)
function ptoDaysInWeek(personId, weekStart, ptoList, holidaySet) {
  let days = 0;
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart.getTime() + i * 86400000);
    const ds = d.toISOString().slice(0, 10);
    if (ptoList.some(p => p.personId === personId && ds >= p.start && ds <= p.end)) days++;
  }
  return days;
}

// Available hours for a person in a week (accounts for PTO + holidays)
function availableHours(personId, weekStartStr, ptoList, holidaySet) {
  const ws = new Date(weekStartStr + "T00:00:00");
  const ptoDays = ptoDaysInWeek(personId, ws, ptoList, holidaySet);
  let holidayDays = 0;
  for (let i = 0; i < 5; i++) {
    const d = new Date(ws.getTime() + i * 86400000);
    const ds = d.toISOString().slice(0, 10);
    if (holidaySet.has(ds)) holidayDays++;
  }
  const offDays = Math.min(5, ptoDays + holidayDays);
  return Math.max(0, WEEKLY_HOURS - offDays * 8);
}
const EFFORT_LABEL = { S: "Small", M: "Medium", L: "Large" };

// --- DATA - deliverables = specific outputs; subtasks = production workflow steps
const initialProjects = [
  {
    id: "proj1", name: "DPP TPL Relaunch", color: "#f59e0b", client: "DPP",
    deliverables: [
      {
        id: "d_2", title: "Kickoff", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-05-19", end: "2026-05-19", progress: 0, dependencies: [], department: "",
        subtasks: [],
      },
      {
        id: "d_3", title: "Receive How-To Guide", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-05-26", end: "2026-05-26", progress: 0, dependencies: [], department: "",
        subtasks: [],
      },
      {
        id: "d_4", title: "Hot Sheet: Enrolled/Unenrolled #1 w/o 6/8", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-05-20", end: "2026-06-05", progress: 0, dependencies: [], department: "",
        subtasks: [
          {
            id: "s_5", title: "Copy Development", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-20", end: "2026-05-22", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_6", title: "Internal Review/Proof", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-25", end: "2026-05-26", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_7", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-27", end: "2026-05-27", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_8", title: "Client Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-28", end: "2026-06-01", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_9", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-02", end: "2026-06-03", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_10", title: "Client Approval", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-04", end: "2026-06-05", progress: 0, dependencies: [], department: "",
          }
          ],
      },
      {
        id: "d_11", title: "Global Connect Message: Enrolled #1 w/o 6/8", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-05-20", end: "2026-06-05", progress: 0, dependencies: [], department: "",
        subtasks: [
          {
            id: "s_12", title: "Copy Development", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-20", end: "2026-05-22", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_13", title: "Internal Review/Proof", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-25", end: "2026-05-26", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_14", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-27", end: "2026-05-27", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_15", title: "Client Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-28", end: "2026-06-01", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_16", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-02", end: "2026-06-03", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_17", title: "Client Approval", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-04", end: "2026-06-05", progress: 0, dependencies: [], department: "",
          }
          ],
      },
      {
        id: "d_18", title: "Global Connect Message: Unenrolled #1 w/o 6/8", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-05-20", end: "2026-06-05", progress: 0, dependencies: [], department: "",
        subtasks: [
          {
            id: "s_19", title: "Copy Development", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-20", end: "2026-05-22", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_20", title: "Internal Review/Proof", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-25", end: "2026-05-26", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_21", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-27", end: "2026-05-27", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_22", title: "Client Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-28", end: "2026-06-01", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_23", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-02", end: "2026-06-03", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_24", title: "Client Approval", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-04", end: "2026-06-05", progress: 0, dependencies: [], department: "",
          }
          ],
      },
      {
        id: "d_25", title: "Hot Sheet: Enrolled/Unenrolled #2 w/o 6/22", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-06-01", end: "2026-06-16", progress: 0, dependencies: [], department: "",
        subtasks: [
          {
            id: "s_26", title: "Copy Development", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-01", end: "2026-06-02", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_27", title: "Internal Review/Proof", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-03", end: "2026-06-04", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_28", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-05", end: "2026-06-05", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_29", title: "Client Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-08", end: "2026-06-10", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_30", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-11", end: "2026-06-12", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_31", title: "Client Approval", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-15", end: "2026-06-16", progress: 0, dependencies: [], department: "",
          }
          ],
      },
      {
        id: "d_32", title: "Global Connect Message: Enrolled #2 w/o 6/22", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-06-01", end: "2026-06-16", progress: 0, dependencies: [], department: "",
        subtasks: [
          {
            id: "s_33", title: "Copy Development", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-01", end: "2026-06-02", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_34", title: "Internal Review/Proof", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-03", end: "2026-06-04", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_35", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-05", end: "2026-06-05", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_36", title: "Client Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-08", end: "2026-06-10", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_37", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-11", end: "2026-06-12", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_38", title: "Client Approval", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-15", end: "2026-06-16", progress: 0, dependencies: [], department: "",
          }
          ],
      },
      {
        id: "d_39", title: "Global Connect Message: Unenrolled #2 w/o 6/22", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-06-01", end: "2026-06-16", progress: 0, dependencies: [], department: "",
        subtasks: [
          {
            id: "s_40", title: "Copy Development", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-01", end: "2026-06-02", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_41", title: "Internal Review/Proof", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-03", end: "2026-06-04", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_42", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-05", end: "2026-06-05", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_43", title: "Client Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-08", end: "2026-06-10", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_44", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-11", end: "2026-06-12", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_45", title: "Client Approval", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-15", end: "2026-06-16", progress: 0, dependencies: [], department: "",
          }
          ],
      },
      {
        id: "d_46", title: "Hot Sheet: Enrolled/Unenrolled #3 w/o 7/13", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-06-15", end: "2026-06-30", progress: 0, dependencies: [], department: "",
        subtasks: [
          {
            id: "s_47", title: "Copy Development", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-15", end: "2026-06-16", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_48", title: "Internal Review/Proof", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-17", end: "2026-06-18", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_49", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-19", end: "2026-06-19", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_50", title: "Client Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-22", end: "2026-06-24", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_51", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-25", end: "2026-06-26", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_52", title: "Client Approval", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-29", end: "2026-06-30", progress: 0, dependencies: [], department: "",
          }
          ],
      },
      {
        id: "d_53", title: "Global Connect Message: Enrolled #3 w/o 7/13", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-06-15", end: "2026-06-30", progress: 0, dependencies: [], department: "",
        subtasks: [
          {
            id: "s_54", title: "Copy Development", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-15", end: "2026-06-16", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_55", title: "Internal Review/Proof", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-17", end: "2026-06-18", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_56", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-19", end: "2026-06-19", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_57", title: "Client Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-22", end: "2026-06-24", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_58", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-25", end: "2026-06-26", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_59", title: "Client Approval", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-29", end: "2026-06-30", progress: 0, dependencies: [], department: "",
          }
          ],
      },
      {
        id: "d_60", title: "Global Connect Message: Unenrolled #3 w/o 7/13", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-06-15", end: "2026-06-30", progress: 0, dependencies: [], department: "",
        subtasks: [
          {
            id: "s_61", title: "Copy Development", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-15", end: "2026-06-16", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_62", title: "Internal Review/Proof", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-17", end: "2026-06-18", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_63", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-19", end: "2026-06-19", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_64", title: "Client Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-22", end: "2026-06-24", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_65", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-25", end: "2026-06-26", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_66", title: "Client Approval", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-29", end: "2026-06-30", progress: 0, dependencies: [], department: "",
          }
          ],
      },
      {
        id: "d_67", title: "Global Connect Message: Unenrolled #4 w/o 7/27", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-06-15", end: "2026-06-30", progress: 0, dependencies: [], department: "",
        subtasks: [
          {
            id: "s_68", title: "Copy Development", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-15", end: "2026-06-16", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_69", title: "Internal Review/Proof", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-17", end: "2026-06-18", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_70", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-19", end: "2026-06-19", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_71", title: "Client Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-22", end: "2026-06-24", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_72", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-25", end: "2026-06-26", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_73", title: "Client Approval", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-29", end: "2026-06-30", progress: 0, dependencies: [], department: "",
          }
          ],
      },
      {
        id: "d_74", title: "Dealer How-To Guide Design", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-05-27", end: "2026-06-12", progress: 0, dependencies: [], department: "",
        subtasks: [
          {
            id: "s_75", title: "Proofreading", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-27", end: "2026-05-28", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_76", title: "Review/Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-29", end: "2026-06-01", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_77", title: "Design Development", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-02", end: "2026-06-04", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_78", title: "Internal Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-05", end: "2026-06-05", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_79", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-08", end: "2026-06-08", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_80", title: "Client Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-09", end: "2026-06-10", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_81", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-11", end: "2026-06-11", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_82", title: "Approval", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-12", end: "2026-06-12", progress: 0, dependencies: [], department: "",
          }
          ],
      },
      {
        id: "d_83", title: "Dealer How-To One-Pager", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-05-27", end: "2026-06-19", progress: 0, dependencies: [], department: "",
        subtasks: [
          {
            id: "s_84", title: "Copy Development", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-27", end: "2026-05-28", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_85", title: "Internal Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-29", end: "2026-06-01", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_86", title: "Design Development", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-02", end: "2026-06-04", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_87", title: "Internal Review/Proof", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-05", end: "2026-06-08", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_88", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-09", end: "2026-06-10", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_89", title: "Client Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-11", end: "2026-06-15", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_90", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-16", end: "2026-06-17", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_91", title: "Client Approval", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-18", end: "2026-06-19", progress: 0, dependencies: [], department: "",
          }
          ],
      },
      {
        id: "d_92", title: "Dealer Fact Sheet Update", status: "Not Started", priority: "Medium",
        assignees: [], start: "2026-05-15", end: "2026-06-11", progress: 0, dependencies: [], department: "",
        subtasks: [
          {
            id: "s_93", title: "Copy Review/Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-15", end: "2026-05-19", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_94", title: "Proofreading", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-20", end: "2026-05-21", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_95", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-22", end: "2026-05-22", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_96", title: "Design Development", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-25", end: "2026-05-27", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_97", title: "Internal Review/Proof", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-05-28", end: "2026-05-29", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_98", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-01", end: "2026-06-02", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_99", title: "Client Review", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-03", end: "2026-06-05", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_100", title: "Revisions", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-08", end: "2026-06-09", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_101", title: "Client Approval", status: "Not Started", priority: "Medium",
            assignees: [], start: "2026-06-10", end: "2026-06-11", progress: 0, dependencies: [], department: "",
          }
          ],
      }
    ],
  },
];

// --- HELPERS ──────────────────────────────────────────────────────────────────
const TIMELINE_START = new Date("2026-05-12");
const TIMELINE_END   = new Date("2026-07-10");
const parseDate = (s) => new Date(s + "T00:00:00");
const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtFull = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtMonth = (d) => d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
const durDays = (start, end) => Math.ceil((parseDate(end) - parseDate(start)) / 86400000) + 1;

// Business days between two date strings (inclusive), skipping weekends + provided holidays
function busyDays(start, end, holidaySet = new Set()) {
  if (!start || !end) return 0;
  let d = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  let count = 0;
  while (d <= e) {
    const ds = d.toISOString().slice(0,10);
    if (d.getDay() !== 0 && d.getDay() !== 6 && !holidaySet.has(ds)) count++;
    d = new Date(d.getTime() + 86400000);
  }
  return Math.max(1, count);
}

const statusMeta = {
  "Not Started":        { color: "#64748b", bg: "rgba(100,116,139,0.1)",  icon: "○",  border: "rgba(100,116,139,0.35)" },
  "In Progress":        { color: "#0ea5e9", bg: "rgba(14,165,233,0.1)",   icon: "◑",  border: "rgba(14,165,233,0.4)"  },
  "Done":               { color: "#10b981", bg: "rgba(16,185,129,0.1)",   icon: "✓",  border: "rgba(16,185,129,0.4)"  },
  "Blocked":            { color: "#ef4444", bg: "rgba(239,68,68,0.1)",    icon: "⊘",  border: "rgba(239,68,68,0.4)"   },
  "Editorial Review":   { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  icon: "✍",  border: "rgba(139,92,246,0.4)"  },
  "Design Review":      { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "◈",  border: "rgba(245,158,11,0.4)"  },
  "Proof Review":       { color: "#f97316", bg: "rgba(249,115,22,0.1)",  icon: "⊙",  border: "rgba(249,115,22,0.4)"  },
  "Internal Review":    { color: "#6366f1", bg: "rgba(99,102,241,0.1)",  icon: "◎",  border: "rgba(99,102,241,0.4)"  },
  "Client Review":      { color: "#ec4899", bg: "rgba(236,72,153,0.1)",  icon: "◉",  border: "rgba(236,72,153,0.4)"  },
  "On Track":           { color: "#10b981", bg: "rgba(16,185,129,0.1)",  icon: "↑",  border: "rgba(16,185,129,0.4)"  },
  "At Risk":            { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "⚠",  border: "rgba(245,158,11,0.4)"  },
  "Off Track":          { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: "↓",  border: "rgba(239,68,68,0.4)"   },
};
const priorityMeta = {
  "Low":      { color: "#4b5563" },
  "Medium":   { color: "#fbbf24" },
  "High":     { color: "#f97316" },
  "Critical": { color: "#ef4444" },
};

function Avatar({ person, size = 26 }) {
  const initials = getInitials(person.name);
  return (
    <div title={person.name} style={{
      width: size, height: size, borderRadius: "50%",
      background: person.color + "28", border: `1.5px solid ${person.color}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 700, color: person.color,
      flexShrink: 0, letterSpacing: "0.02em", userSelect: "none",
    }}>{initials}</div>
  );
}

function StatusBadge({ status, small }) {
  const m = statusMeta[status] || statusMeta["Not Started"];
  return (
    <span style={{
      background: m.bg, color: m.color,
      border: `1px solid ${m.border || m.color + "40"}`,
      borderRadius: 4, padding: small ? "1px 6px" : "2px 8px",
      fontSize: small ? 10 : 11, fontWeight: 600, letterSpacing: "0.04em",
      whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 3,
    }}>
      {m.icon && <span style={{ fontSize: small ? 8 : 9, opacity: 0.9 }}>{m.icon}</span>}
      {status}
    </span>
  );
}

function PriorityDot({ priority }) {
  const m = priorityMeta[priority] || priorityMeta["Low"];
  return <span style={{ color: m.color, fontWeight: 700, fontSize: 10, letterSpacing: "0.03em" }}>● {priority}</span>;
}

const deptMeta = {
  "Editorial":  { color: "#f59e0b", icon: "✍" },
  "Design":     { color: "#e879f9", icon: "◈" },
  "Proof":      { color: "#fb923c", icon: "◉" },
  "Strategy":   { color: "#38bdf8", icon: "◆" },
  "Account":    { color: "#34d399", icon: "◎" },
  "Production": { color: "#4b5563", icon: "▣" },
  "Client Review": { color: "#a78bfa", icon: "◎" },
};

function DeptBadge({ dept }) {
  if (!dept) return null;
  const m = deptMeta[dept] || { color: "#6b7280", icon: "●" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: m.color + "15", color: m.color,
      border: `1px solid ${m.color}35`,
      borderRadius: 4, padding: "1px 7px", fontSize: 10, fontWeight: 700,
      letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>{m.icon} {dept}</span>
  );
}

function ProgressBar({ value, color = "#f59e0b", height = 4 }) {
  return (
    <div style={{ height, background: "rgba(0,0,0,0.08)", borderRadius: 2, overflow: "hidden", minWidth: 40 }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 2, transition: "width 0.5s ease" }} />
    </div>
  );
}

// --- CHECK BUTTON ─────────────────────────────────────────────────────────────
function CheckButton({ isDone, onClick }) {
  return (
    <div onClick={e => { e.stopPropagation(); onClick(); }} title={isDone ? "Mark incomplete" : "Mark done"}
      style={{
        width: 18, height: 18, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
        border: `1.5px solid ${isDone ? "#34d399" : "rgba(0,0,0,0.12)"}`,
        background: isDone ? "#34d39922" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s", color: isDone ? "#34d399" : "transparent",
        fontSize: 10, fontWeight: 900, lineHeight: 1,
      }}
      onMouseEnter={e => { if (!isDone) { e.currentTarget.style.borderColor = "#34d399"; e.currentTarget.style.color = "#34d39966"; } }}
      onMouseLeave={e => { if (!isDone) { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; e.currentTarget.style.color = "transparent"; } }}
    >✓</div>
  );
}

// ─── PROJECT DETAILS MODAL ───────────────────────────────────────────────────
function ProjectDetailsModal({ proj, people, onClose, onSave, onArchive, onDelete, onSaveAsTemplate }) {
  const [form, setForm] = useState({
    name:           proj.name,
    client:         proj.client || "",
    ownerId:        proj.ownerId || "",
    teamMemberIds:  proj.teamMemberIds || [],
    notes:          proj.notes || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleMember = (id) => set("teamMemberIds",
    form.teamMemberIds.includes(id)
      ? form.teamMemberIds.filter(x => x !== id)
      : [...form.teamMemberIds, id]
  );
  const owner = people.find(p => p.id === form.ownerId);
  const teamMembers = people.filter(p => form.teamMemberIds.includes(p.id));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({ ...proj, ...form, ownerId: form.ownerId || null });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const labelStyle = { fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.07em",
    textTransform: "uppercase", marginBottom: 5, display: "block" };
  const inputStyle = { width: "100%", fontSize: 13, border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 7, padding: "8px 11px", fontFamily: "inherit", background: "#fff",
    outline: "none", boxSizing: "border-box" };

  return (
    <Overlay onClose={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 14, width: 520, maxWidth: "95vw",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ background: proj.color + "18", borderBottom: `3px solid ${proj.color}`, padding: "18px 22px",
          display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: proj.color, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.08em",
              textTransform: "uppercase", marginBottom: 3 }}>Project Details</div>
            <input value={form.name} onChange={e => set("name", e.target.value)}
              style={{ fontSize: 18, fontWeight: 800, color: "#1f2937", background: "transparent",
                border: "none", outline: "none", width: "100%", fontFamily: "inherit" }} />
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20,
            color: "#9ca3af", cursor: "pointer", lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18, overflowY: "auto", maxHeight: "65vh" }}>

          {/* Client */}
          <div>
            <label style={labelStyle}>Client / Account</label>
            <input value={form.client} onChange={e => set("client", e.target.value)}
              placeholder="Client name" style={inputStyle} />
          </div>

          {/* Owner / Account Lead */}
          <div>
            <label style={labelStyle}>Account Lead / Project Owner</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div onClick={() => set("ownerId", "")}
                style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${!form.ownerId ? proj.color : "rgba(0,0,0,0.1)"}`,
                  background: !form.ownerId ? proj.color + "15" : "transparent",
                  color: !form.ownerId ? proj.color : "#6b7280", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                None
              </div>
              {people.map(p => {
                const sel = form.ownerId === p.id;
                return (
                  <div key={p.id} onClick={() => set("ownerId", sel ? "" : p.id)}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 8,
                      border: `1px solid ${sel ? p.color : "rgba(0,0,0,0.1)"}`,
                      background: sel ? p.color + "15" : "transparent", cursor: "pointer", transition: "all 0.1s" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: p.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                      {p.name.split(" ").map(n => n[0]).join("").slice(0,2)}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: sel ? 700 : 400, color: sel ? p.color : "#374151" }}>{p.name}</span>
                    {sel && <span style={{ fontSize: 9, color: p.color }}>✓</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project Team */}
          <div>
            <label style={labelStyle}>Project Team
              <span style={{ fontSize: 9, fontWeight: 400, color: "#9ca3af", marginLeft: 6,
                textTransform: "none", letterSpacing: 0 }}>Not automatically assigned to tasks</span>
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {people.map(p => {
                const sel = form.teamMemberIds.includes(p.id);
                return (
                  <div key={p.id} onClick={() => toggleMember(p.id)}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 8,
                      border: `1px solid ${sel ? p.color : "rgba(0,0,0,0.1)"}`,
                      background: sel ? p.color + "15" : "transparent", cursor: "pointer", transition: "all 0.1s" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: p.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                      {p.name.split(" ").map(n => n[0]).join("").slice(0,2)}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: sel ? 700 : 400, color: sel ? p.color : "#374151" }}>{p.name}</span>
                    {sel && <span style={{ fontSize: 9, color: p.color }}>✓</span>}
                  </div>
                );
              })}
            </div>
            {teamMembers.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>Selected:</span>
                {teamMembers.map(p => (
                  <span key={p.id} style={{ fontSize: 10, fontWeight: 700, color: p.color,
                    background: p.color + "15", borderRadius: 5, padding: "2px 8px" }}>{p.name}</span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Project Notes
              <span style={{ fontSize: 9, fontWeight: 400, color: "#9ca3af", marginLeft: 6,
                textTransform: "none", letterSpacing: 0 }}>Visible to all team members</span>
            </label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Project goals, context, key dates, links, anything the team should know…"
              rows={5} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid rgba(0,0,0,0.07)",
          background: "#fafafa", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Project actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {onSaveAsTemplate && (
              <button onClick={() => { onSaveAsTemplate(proj); }}
                style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(167,139,250,0.4)",
                  background: "rgba(167,139,250,0.08)", color: "#7c3aed", fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit" }}>📋 Save as Template</button>
            )}
            {onArchive && !proj.archived && (
              <button onClick={() => window.confirm(`Archive "${proj.name}"?`) && onArchive(proj.id)}
                style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(251,191,36,0.4)",
                  background: "rgba(251,191,36,0.08)", color: "#b45309", fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit" }}>⊡ Archive</button>
            )}
            {onDelete && (
              <button onClick={() => window.confirm(`Permanently delete "${proj.name}"? This cannot be undone.`) && onDelete(proj.id)}
                style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)",
                  background: "rgba(239,68,68,0.06)", color: "#dc2626", fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit" }}>🗑 Delete</button>
            )}
          </div>
          {/* Save/cancel */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              {owner ? <span>Lead: <strong style={{ color: owner.color }}>{owner.name}</strong></span> : "No lead assigned"}
              {teamMembers.length > 0 && <span style={{ marginLeft: 12 }}>Team: {teamMembers.length}</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid rgba(0,0,0,0.1)",
                background: "transparent", color: "#6b7280", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: "8px 20px", borderRadius: 7, border: "none",
                background: saved ? "#34d399" : proj.color, color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", transition: "background 0.2s" }}>
                {saved ? "✓ Saved" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

// --- TASK EDIT MODAL ──────────────────────────────────────────────────────────
function TaskModal({ item, projectColor, allItems, onClose, onSave, allPeople, onDelete, holidays = [], statusNotes = {}, onUpdateNote, trackStatus }) {
  const [form, setForm] = useState({ ...item });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const togglePerson = (id) => set("assignees", form.assignees.includes(id)
    ? form.assignees.filter(x => x !== id) : [...form.assignees, id]);
  const toggleDep = (id) => set("dependencies", (form.dependencies || []).includes(id)
    ? (form.dependencies || []).filter(x => x !== id) : [...(form.dependencies || []), id]);

  const holidaySet = new Set(holidays.map(h => h.date));

  // Advance a date string past weekends and holidays
  const nextWorkDay = (dateStr) => {
    if (!dateStr) return dateStr;
    let d = new Date(dateStr + "T00:00:00");
    while (d.getDay() === 0 || d.getDay() === 6 || holidaySet.has(d.toISOString().slice(0,10))) {
      d = new Date(d.getTime() + 86400000);
    }
    return d.toISOString().slice(0,10);
  };

  // Add n calendar days, then snap to next working day
  const addDays = (dateStr, n) => {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + Math.max(0, n - 1));
    return nextWorkDay(d.toISOString().slice(0,10));
  };

  // Count calendar days inclusive (what the user sees as "duration")
  const calcDuration = (s, e) => {
    if (!s || !e) return 1;
    return Math.max(1, Math.ceil((parseDate(e) - parseDate(s)) / 86400000) + 1);
  };

  const duration = calcDuration(form.start, form.end);

  // When Start changes: preserve duration, recalculate End
  const handleStartChange = (newStart) => {
    const dur = calcDuration(form.start, form.end);
    const clean = nextWorkDay(newStart);
    const newEnd = addDays(clean, dur);
    setForm(f => ({ ...f, start: clean, end: newEnd }));
  };

  // When End changes: just update end (duration shown updates automatically)
  const handleEndChange = (newEnd) => {
    const clean = nextWorkDay(newEnd);
    // Ensure end >= start
    const newStart = clean < form.start ? clean : form.start;
    setForm(f => ({ ...f, start: newStart, end: clean }));
  };

  // When Duration changes: keep Start, recalculate End
  const handleDurationChange = (val) => {
    const days = Math.max(1, parseInt(val) || 1);
    const newEnd = addDays(form.start, days);
    setForm(f => ({ ...f, end: newEnd }));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)", overflowY: "auto", padding: "40px 16px" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 12, width: 580, maxHeight: "none", overflow: "visible", boxShadow: "0 30px 90px rgba(0,0,0,0.35)" }}>
        {/* Header */}
        <div style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", padding: "14px 22px 14px", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 4, height: "100%", minHeight: 38, background: projectColor, borderRadius: 2, flexShrink: 0, alignSelf: "stretch" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Breadcrumb: Project → Deliverable → Task */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: projectColor, letterSpacing: "0.04em" }}>{item.projectName || ""}</span>
              {item.deliverableId && item.delTitle && (
                <>
                  <span style={{ fontSize: 10, color: "#d1d5db" }}>›</span>
                  <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>{item.delTitle}</span>
                  <span style={{ fontSize: 10, color: "#d1d5db" }}>›</span>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>Task</span>
                </>
              )}
              {!item.deliverableId && (
                <>
                  <span style={{ fontSize: 10, color: "#d1d5db" }}>›</span>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>Deliverable</span>
                </>
              )}
            </div>
            <input value={form.title} onChange={e => set("title", e.target.value)}
              style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#111827", fontSize: fs(17), fontWeight: 700, fontFamily: "inherit" }} />
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 22, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Status + Priority */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[["Status", "status", STATUSES], ["Priority", "priority", PRIORITIES]].map(([label, key, opts]) => (
              <div key={key}>
                <div style={labelStyle}>{label}</div>
                <select value={form[key]} onChange={e => set(key, e.target.value)} style={selectStyle}>
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          {/* Department + Effort */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={labelStyle}>Department</div>
              <select value={form.department || ""} onChange={e => set("department", e.target.value)} style={selectStyle}>
                <option value="">— None —</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Effort</div>
              <div style={{ display: "flex", gap: 6 }}>
                {EFFORT_OPTS.map(e => (
                  <button key={e} onClick={() => set("effort", e)} style={{
                    flex: 1, padding: "6px 0", borderRadius: 6, cursor: "pointer",
                    fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                    border: `1.5px solid ${form.effort === e ? projectColor : "rgba(0,0,0,0.12)"}`,
                    background: form.effort === e ? projectColor + "15" : "transparent",
                    color: form.effort === e ? projectColor : "#6b7280",
                  }}>
                    {EFFORT_LABEL[e]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Dates + Duration — all linked */}
          <div>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Dates &amp; Duration <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 9 }}>— editing one field auto-updates the others · holidays &amp; weekends skipped</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.6fr", gap: 12 }}>
              <div>
                <div style={labelStyle}>Start Date</div>
                <input type="date" value={form.start} onChange={e => handleStartChange(e.target.value)}
                  style={{ ...selectStyle, width: "100%" }} />
              </div>
              <div>
                <div style={labelStyle}>End Date</div>
                <input type="date" value={form.end} onChange={e => handleEndChange(e.target.value)}
                  style={{ ...selectStyle, width: "100%" }} />
              </div>
              <div>
                <div style={labelStyle}>Duration (days)</div>
                <input type="number" min={1} value={duration}
                  onChange={e => handleDurationChange(e.target.value)}
                  style={{ ...selectStyle, width: "100%", textAlign: "center" }} />
              </div>
            </div>
            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 5 }}>
              {form.start && form.end && `${fmt(parseDate(form.start))} → ${fmt(parseDate(form.end))} · ${duration} day${duration !== 1 ? "s" : ""}`}
            </div>
          </div>
          {/* Progress */}
          <div>
            <div style={{ ...labelStyle, display: "flex", justifyContent: "space-between" }}>
              <span>Progress</span><span style={{ color: "#f59e0b", fontWeight: 700 }}>{form.progress}%</span>
            </div>
            <input type="range" min={0} max={100} value={form.progress} onChange={e => set("progress", +e.target.value)}
              style={{ width: "100%", accentColor: projectColor }} />
          </div>
          {/* Assignees */}
          <div>
            <div style={labelStyle}>Assignees</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {allPeople.map(p => (
                <div key={p.id} onClick={() => togglePerson(p.id)} style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "5px 12px", borderRadius: 20, cursor: "pointer",
                  border: `1.5px solid ${form.assignees.includes(p.id) ? p.color : "rgba(0,0,0,0.06)"}`,
                  background: form.assignees.includes(p.id) ? p.color + "18" : "transparent",
                  transition: "all 0.12s", userSelect: "none",
                }}>
                  <Avatar person={p} size={20} />
                  <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Dependencies — collapsible, collapsed by default */}
          {allItems && allItems.length > 0 && (() => {
            const activeDeps = (form.dependencies || []);
            const [depsOpen, setDepsOpen] = React.useState(false);
            return (
              <div style={{ border: "1px solid rgba(0,0,0,0.07)", borderRadius: 8, overflow: "hidden" }}>
                {/* Header — always visible */}
                <button
                  onClick={() => setDepsOpen(o => !o)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 12px", background: "rgba(0,0,0,0.02)", border: "none", cursor: "pointer",
                    fontFamily: "inherit", textAlign: "left" }}
                >
                  <span style={{ ...labelStyle, margin: 0 }}>
                    Dependencies
                    {activeDeps.length > 0 && (
                      <span style={{ marginLeft: 8, background: projectColor + "20", color: projectColor,
                        borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
                        {activeDeps.length} selected
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 10, color: "#9ca3af", transition: "transform 0.15s",
                    display: "inline-block", transform: depsOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </button>
                {/* Collapsible body */}
                {depsOpen && (
                  <div style={{ padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: 8,
                    borderTop: "1px solid rgba(0,0,0,0.05)", background: "#fff" }}>
                    {allItems.filter(x => x.id !== item.id).map(dep => {
                      const active = activeDeps.includes(dep.id);
                      return (
                        <div key={dep.id} onClick={() => toggleDep(dep.id)} style={{
                          padding: "4px 11px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
                          border: `1px solid ${active ? projectColor : "rgba(0,0,0,0.06)"}`,
                          background: active ? projectColor + "18" : "transparent",
                          color: active ? projectColor : "#64748b", transition: "all 0.12s", userSelect: "none",
                        }}>{dep.title}</div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Track Status (from Status tab) ── */}
          {trackStatus && (() => {
            const meta = statusMeta[trackStatus] || statusMeta["On Track"];
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: meta.bg + "60", border: `1px solid ${meta.color}25`, borderRadius: 8 }}>
                <span style={{ fontSize: 13 }}>{meta.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Project Track Status</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{trackStatus}</div>
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>Set on Status tab</div>
              </div>
            );
          })()}

          {/* ── File Link ── */}
          <div>
            <div style={labelStyle}>File / Link</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={form.file_url || ""}
                onChange={e => set("file_url", e.target.value)}
                placeholder="https://docs.google.com/… or any URL"
                style={{ ...selectStyle, flex: 1 }}
              />
              {form.file_url && (
                <a href={form.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ flexShrink: 0, background: projectColor + "18", border: `1px solid ${projectColor}40`, color: projectColor, borderRadius: 6, padding: "7px 12px", fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}
                  onClick={e => e.stopPropagation()}
                >Open ↗</a>
              )}
            </div>
          </div>

          {/* ── Notes ── */}
          <div>
            <div style={labelStyle}>Notes</div>
            <textarea
              value={(() => {
                const noteKey = item.deliverableId
                  ? `${item.projectId}::${item.deliverableId}`
                  : `${item.projectId}::${item.id}`;
                return statusNotes[noteKey] || "";
              })()}
              onChange={e => {
                if (!onUpdateNote) return;
                const noteKey = item.deliverableId
                  ? `${item.projectId}::${item.deliverableId}`
                  : `${item.projectId}::${item.id}`;
                onUpdateNote(noteKey, e.target.value);
              }}
              placeholder="Add notes, context, or updates…"
              rows={3}
              style={{ ...selectStyle, resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }}
            />
          </div>
        </div>
        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", padding: "14px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {onDelete ? (
            <button onClick={() => { if (window.confirm("Delete this item?")) { onDelete(); onClose(); } }} style={{
              background: "none", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6,
              color: "#f87171", padding: "7px 14px", cursor: "pointer", fontSize: 12, fontFamily: "inherit",
            }}>Delete</button>
          ) : <div />}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button onClick={() => { onSave(form); onClose(); }} style={{ ...cancelBtnStyle, background: projectColor, color: "#000", border: "none", fontWeight: 700 }}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
const labelStyle = { fontSize: 10, color: "#6b7280", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 6 };
const selectStyle = { width: "100%", background: "#f7f8fa", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 6, color: "#111827", padding: "7px 10px", fontFamily: "inherit", fontSize: 12, boxSizing: "border-box" };
const cancelBtnStyle = { background: "rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 6, color: "#4b5563", padding: "7px 16px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 };

// --- DASHBOARD ────────────────────────────────────────────────────────────────
// ─── DASHBOARD ADD BUTTON ────────────────────────────────────────────────────
function DashboardAddButton({ projects, onAddDeliverable, onNewProject }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.1em", textTransform: "uppercase" }}>All Deliverables</div>
      <div style={{ position: "relative" }}>
        <button onClick={() => setOpen(o => !o)} style={{
          display: "flex", alignItems: "center", gap: 5,
          background: BRAND_TEAL_L, border: `1px solid ${BRAND_TEAL}60`,
          color: BRAND_TEAL_D, borderRadius: 6, padding: "5px 12px", cursor: "pointer",
          fontSize: 11, fontWeight: 800, fontFamily: "inherit",
        }}>+ Add {open ? "▲" : "▼"}</button>
        {open && (
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 100,
            background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 200, overflow: "hidden",
          }}>
            <div style={{ padding: "8px 12px", fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>NEW PROJECT</div>
            <button onClick={() => { onNewProject(); setOpen(false); }} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: "10px 14px", background: "none", border: "none", borderBottom: "1px solid rgba(0,0,0,0.06)",
              cursor: "pointer", fontSize: fs(12), fontWeight: 600, color: "#1f2937", fontFamily: "inherit", textAlign: "left",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >◈ Create new project</button>
            <div style={{ padding: "8px 12px", fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>ADD TO EXISTING PROJECT</div>
            {projects.map(proj => (
              <button key={proj.id} onClick={() => { onAddDeliverable(proj); setOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "9px 14px", background: "none", border: "none", borderBottom: "1px solid rgba(0,0,0,0.04)",
                cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#374151", fontFamily: "inherit", textAlign: "left",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: proj.color, display: "inline-block", flexShrink: 0 }} />
                {proj.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardView({ projects, people, onEditItem, onAddDeliverable, onAddSubtask, onNewProject, holidays = [], pto = [], savePto, onOpenProject }) {
  const allDeliverables = projects.flatMap(p => p.deliverables.map(d => ({ ...d, projectId: p.id, projectName: p.name, projectColor: p.color })));
  const allSubtasks = projects.flatMap(p => p.deliverables.flatMap(d => d.subtasks.map(s => ({ ...s, projectId: p.id, projectName: p.name, projectColor: p.color, deliverableId: d.id }))));
  const allItems = [...allDeliverables, ...allSubtasks];
  const _tod = new Date(); _tod.setHours(0,0,0,0);
  const _todStr = _tod.toISOString().slice(0,10);
  const [showOooForm, setShowOooForm] = useState(false);
  const [oooForm, setOooForm] = useState({ personId: people[0]?.id || "", start: _todStr, end: _todStr, note: "" });
  const [sortCol, setSortCol] = useState("start");
  const [sortDir, setSortDir] = useState("asc");
  const toggleSort = (col) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const sortedDeliverables = [...allDeliverables].sort((a, b) => {
    let av, bv;
    switch(sortCol) {
      case "title":    av = a.title;       bv = b.title; break;
      case "project":  av = a.projectName; bv = b.projectName; break;
      case "status":   av = a.status;      bv = b.status; break;
      case "priority": av = ["Low","Medium","High","Critical"].indexOf(a.priority); bv = ["Low","Medium","High","Critical"].indexOf(b.priority); break;
      case "start":    av = a.start || ""; bv = b.start || ""; break;
      case "end":      av = a.end || "";   bv = b.end || ""; break;
      case "dur":      av = durDays(a.start, a.end); bv = durDays(b.start, b.end); break;
      case "progress": av = a.progress;    bv = b.progress; break;
      default:         av = ""; bv = "";
    }
    const r = typeof av === "number" ? av - bv : String(av || "").localeCompare(String(bv || ""));
    return sortDir === "asc" ? r : -r;
  });
  const SortTh = ({ col, label }) => (
    <th onClick={() => toggleSort(col)} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: sortCol === col ? BRAND_TEAL_D : "#6b7280", letterSpacing: "0.07em", textTransform: "uppercase", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
      {label} {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );

  const statusCounts = STATUSES.reduce((a, s) => ({ ...a, [s]: allItems.filter(t => t.status === s).length }), {});
  const total = allItems.length;

  const workload = people.map(p => ({
    person: p,
    count: allItems.filter(t => t.assignees.includes(p.id)).length,
    active: allItems.filter(t => t.assignees.includes(p.id) && t.status === "In Progress").length,
    blocked: allItems.filter(t => t.assignees.includes(p.id) && t.status === "Blocked").length,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* KPI row 1 — status counts */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {STATUSES.map(s => {
          const m = statusMeta[s] || statusMeta["Not Started"]; const c = statusCounts[s];
          if (!c) return null;
          return (
            <div key={s} style={{ background: "#ffffff", border: `1px solid ${m.color}40`, borderRadius: 10, padding: "12px 18px", position: "relative", overflow: "hidden", minWidth: 100, flex: "1 1 auto" }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, width: `${Math.round((c/total)*100)}%`, height: 3, background: m.color }} />
              <div style={{ fontSize: 28, fontWeight: 900, color: m.color, lineHeight: 1 }}>{c}</div>
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4, fontWeight: 700, letterSpacing: "0.07em" }}>{s.toUpperCase()}</div>
            </div>
          );
        })}
      </div>

      {/* KPI row 2 — dept distribution breakdown */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "16px 20px" }}>
        <div style={{ fontSize: fs(10), fontWeight: 700, color: "#6b7280", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 14 }}>Work Distribution by Department</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
          {DEPARTMENTS.map(dept => {
            const m = deptMeta[dept] || { color: "#6b7280", icon: "●" };
            const deptItems = allItems.filter(d => d.department === dept);
            const ns = deptItems.filter(d => d.status === "Not Started").length;
            const ip = deptItems.filter(d => d.status === "In Progress").length;
            const dn = deptItems.filter(d => d.status === "Done").length;
            const bl = deptItems.filter(d => d.status === "Blocked").length;
            const total = deptItems.length;
            if (!total) return null;
            return (
              <div key={dept} style={{ background: m.color + "08", border: `1px solid ${m.color}30`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>{m.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: m.color }}>{dept}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 900, color: m.color }}>{total}</span>
                </div>
                {/* Mini progress bar */}
                <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", gap: 1, marginBottom: 8 }}>
                  {dn > 0 && <div style={{ flex: dn, background: "#34d399" }} />}
                  {ip > 0 && <div style={{ flex: ip, background: "#38bdf8" }} />}
                  {bl > 0 && <div style={{ flex: bl, background: "#f87171" }} />}
                  {ns > 0 && <div style={{ flex: ns, background: "#e5e7eb" }} />}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {[["Not Started", ns, "#9ca3af"], ["In Progress", ip, "#38bdf8"], ["Done", dn, "#34d399"], ["Blocked", bl, "#f87171"]].map(([lbl, cnt, col]) =>
                    cnt > 0 ? (
                      <div key={lbl} style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: col }}>
                        <span style={{ fontWeight: 600 }}>{lbl}</span>
                        <span style={{ fontWeight: 800 }}>{cnt}</span>
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18 }}>
        {/* Project health */}
        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: 20 }}>
          <SectionHeader>Project Health</SectionHeader>
          {projects.map(proj => {
            const all = proj.deliverables.flatMap(d => [d, ...d.subtasks]);
            const done = all.filter(t => t.status === "Done").length;
            const blocked = all.filter(t => t.status === "Blocked").length;
            const avg = Math.round(all.reduce((s, t) => s + t.progress, 0) / all.length);
            return (
              <div key={proj.id} style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: "#1f2937" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: proj.color, display: "inline-block" }} />{proj.name}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: fs(11), color: "#6b7280" }}>{done}/{all.length} done {blocked > 0 && <span style={{ color: "#f87171", marginLeft: 8 }}>⚠ {blocked}</span>}</span>
                    <button onClick={() => onAddDeliverable(proj)} style={{
                      background: proj.color + "15", border: `1px solid ${proj.color}50`,
                      color: proj.color, borderRadius: 4, padding: "2px 8px", cursor: "pointer",
                      fontSize: 10, fontWeight: 800, fontFamily: "inherit", lineHeight: "16px",
                    }}>+ Add</button>
                  </div>
                </div>
                <ProgressBar value={avg} color={proj.color} />
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2, textAlign: "right" }}>{avg}%</div>
              </div>
            );
          })}
        </div>
        {/* Workload */}
        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: 20 }}>
          <SectionHeader>Team Workload</SectionHeader>
          {workload.map(({ person, count, active, blocked }) => (
            <div key={person.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <Avatar person={person} size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1f2937" }}>{person.name}</span>
                  <span style={{ fontSize: 10, color: "#6b7280" }}>
                    {count} tasks · {active} active {blocked > 0 && <span style={{ color: "#f87171" }}>· {blocked} blocked</span>}
                  </span>
                </div>
                <ProgressBar value={Math.min((count / 12) * 100, 100)} color={person.color} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Upcoming Out of Office ── */}
        {(() => {
          const today = new Date(); today.setHours(0,0,0,0);
          const todayStr = today.toISOString().slice(0,10);
          const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + 28);
          const cutoffStr = cutoff.toISOString().slice(0,10);
          const upcoming = pto
            .filter(p => p.end >= todayStr && p.start <= cutoffStr)
            .sort((a, b) => a.start.localeCompare(b.start));
          return (
            <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <SectionHeader noMargin>Upcoming Out of Office</SectionHeader>
                <button onClick={() => setShowOooForm(f => !f)} style={{ fontSize: 10, fontWeight: 700, background: BRAND_TEAL_L, border: `1px solid ${BRAND_TEAL}50`, color: BRAND_TEAL_D, borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit" }}>
                  {showOooForm ? "Cancel" : "+ Add"}
                </button>
              </div>
              {showOooForm && (
                <div style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 8, padding: 12, marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Person</div>
                    <select value={oooForm.personId} onChange={e => setOooForm(f => ({...f, personId: e.target.value}))}
                      style={{ width: "100%", fontSize: 11, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 5, padding: "5px 8px", fontFamily: "inherit", background: "#fff" }}>
                      {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Start</div>
                      <input type="date" value={oooForm.start} onChange={e => setOooForm(f => ({...f, start: e.target.value}))}
                        style={{ width: "100%", fontSize: 11, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 5, padding: "5px 8px", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>End</div>
                      <input type="date" value={oooForm.end} onChange={e => setOooForm(f => ({...f, end: e.target.value}))}
                        style={{ width: "100%", fontSize: 11, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 5, padding: "5px 8px", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Note (optional)</div>
                    <input value={oooForm.note} onChange={e => setOooForm(f => ({...f, note: e.target.value}))}
                      placeholder="Vacation, Conference, Medical…"
                      style={{ width: "100%", fontSize: 11, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 5, padding: "5px 8px", fontFamily: "inherit", boxSizing: "border-box" }} />
                  </div>
                  <button
                    onClick={() => {
                      if (!oooForm.personId || !oooForm.start || !oooForm.end) return;
                      savePto && savePto({ id: "pto_" + Date.now(), personId: oooForm.personId, start: oooForm.start, end: oooForm.end, note: oooForm.note });
                      setShowOooForm(false);
                      setOooForm({ personId: people[0]?.id || "", start: _todStr, end: _todStr, note: "" });
                    }}
                    style={{ background: BRAND_TEAL, border: "none", borderRadius: 5, color: BRAND_NAVY, fontSize: 11, fontWeight: 700, padding: "7px 0", cursor: "pointer", fontFamily: "inherit" }}
                  >Save Time Off</button>
                </div>
              )}
              {upcoming.length === 0 ? (
                <div style={{ fontSize: 11, color: "#9ca3af", padding: "8px 0" }}>No scheduled time off in the next 4 weeks.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {upcoming.map(p => {
                    const person = people.find(x => x.id === p.personId);
                    if (!person) return null;
                    const isNow = p.start <= todayStr && p.end >= todayStr;
                    const startD = parseDate(p.start);
                    const endD   = parseDate(p.end);
                    const days   = Math.round((endD - startD) / 86400000) + 1;
                    return (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar person={person} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#1f2937" }}>{person.name}</span>
                            {isNow && <span style={{ fontSize: 9, fontWeight: 700, background: "#fef3c7", color: "#d97706", borderRadius: 4, padding: "1px 5px" }}>Out now</span>}
                          </div>
                          <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>
                            {fmt(startD)}{days > 1 ? ` – ${fmt(endD)}` : ""} · {days} day{days !== 1 ? "s" : ""}
                            {p.note ? <span style={{ color: "#9ca3af" }}> · {p.note}</span> : ""}
                          </div>
                        </div>
                        {/* Mini timeline bar */}
                        {(() => {
                          const total = 28;
                          const daysFromToday = Math.max(0, Math.round((startD - today) / 86400000));
                          const barLeft = Math.min(100, (daysFromToday / total) * 100);
                          const barW = Math.min(100 - barLeft, (days / total) * 100);
                          return (
                            <div style={{ width: 80, height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 3, flexShrink: 0, position: "relative", overflow: "hidden" }} title={`${fmt(startD)} – ${fmt(endD)}`}>
                              <div style={{ position: "absolute", left: `${barLeft}%`, width: `${Math.max(barW, 4)}%`, height: "100%", background: person.color, borderRadius: 3, opacity: isNow ? 1 : 0.6 }} />
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </div>
      {/* Task table */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden" }}>
        <DashboardAddButton projects={projects} onAddDeliverable={onAddDeliverable} onNewProject={() => {
          // bubble up — we need a callback
          if (onNewProject) onNewProject();
        }} />
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <SortTh col="title" label="Deliverable" />
              <SortTh col="project" label="Project" />
              <SortTh col="status" label="Status" />
              <SortTh col="priority" label="Priority" />
              <th style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.07em", textTransform: "uppercase" }}>Assignees</th>
              <SortTh col="start" label="Start" />
              <SortTh col="end" label="End" />
              <SortTh col="dur" label="Dur." />
              <SortTh col="progress" label="Progress" />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedDeliverables.map(d => {
              const proj = projects.find(p => p.id === d.projectId);
              return (
                <React.Fragment key={d.id}>
                  {/* Deliverable row */}
                  <tr style={{ borderBottom: "none" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 14px", fontSize: fs(12), fontWeight: 700, color: d.status === "Done" ? "#9ca3af" : "#1f2937", textDecoration: d.status === "Done" ? "line-through" : "none", cursor: "pointer" }} onClick={() => onEditItem(d)}>{d.title}</td>
                    <td style={{ padding: "10px 14px" }}><span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: fs(11), color: "#6b7280" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: d.projectColor, display: "inline-block" }} />{d.projectName}</span></td>
                    <td style={{ padding: "10px 14px" }}><StatusBadge status={d.status} small /></td>
                    <td style={{ padding: "10px 14px" }}><PriorityDot priority={d.priority} /></td>
                    <td style={{ padding: "10px 14px" }}><div style={{ display: "flex" }}>{d.assignees.map(id => { const p = people.find(x => x.id === id); return p ? <div key={id} style={{ marginRight: -5 }}><Avatar person={p} size={22} /></div> : null; })}</div></td>
                    <td style={{ padding: "10px 14px", fontSize: fs(11), color: "#6b7280" }}>{fmt(parseDate(d.start))}</td>
                    <td style={{ padding: "10px 14px", fontSize: fs(11), color: "#6b7280" }}>{fmt(parseDate(d.end))}</td>
                    <td style={{ padding: "10px 14px", fontSize: fs(11), color: "#6b7280" }} title="Business days">{busyDays(d.start, d.end, new Set(holidays.map(h=>h.date)))}d</td>
                    <td style={{ padding: "10px 14px", width: 110 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <ProgressBar value={d.progress} color={d.projectColor} />
                        <span style={{ fontSize: 10, color: "#6b7280", minWidth: 26 }}>{d.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <button onClick={() => onAddSubtask(proj, d)} style={{
                        background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 4,
                        color: "#6b7280", padding: "2px 8px", cursor: "pointer",
                        fontSize: 10, fontWeight: 700, fontFamily: "inherit", transition: "all 0.12s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = d.projectColor; e.currentTarget.style.color = d.projectColor; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; e.currentTarget.style.color = "#6b7280"; }}
                      >+ Subtask</button>
                    </td>
                  </tr>

                  {/* Existing subtask rows */}
                  {(d.subtasks || []).map(sub => (
                    <tr key={sub.id} style={{ background: "rgba(0,0,0,0.015)", borderBottom: "none" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.035)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.015)"}>
                      <td style={{ padding: "6px 14px 6px 28px", fontSize: fs(11), color: sub.status === "Done" ? "#9ca3af" : "#374151", textDecoration: sub.status === "Done" ? "line-through" : "none", cursor: "pointer" }}
                        onClick={() => onEditItem({ ...sub, projectId: d.projectId, projectName: d.projectName, projectColor: d.projectColor, deliverableId: d.id, delTitle: d.title })}>
                        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ width: 2, height: 12, background: d.projectColor + "80", borderRadius: 1, flexShrink: 0 }} />
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: (statusMeta[sub.status] || statusMeta["Not Started"]).color, flexShrink: 0 }} />
                          {sub.title}
                        </span>
                      </td>
                      <td colSpan={2} style={{ padding: "6px 14px" }}><StatusBadge status={sub.status} small /></td>
                      <td style={{ padding: "6px 14px" }}><PriorityDot priority={sub.priority} /></td>
                      <td style={{ padding: "6px 14px" }}><div style={{ display: "flex" }}>{(sub.assignees || []).map(id => { const p = people.find(x => x.id === id); return p ? <div key={id} style={{ marginRight: -5 }}><Avatar person={p} size={20} /></div> : null; })}</div></td>
                      <td style={{ padding: "6px 14px", fontSize: 11, color: "#9ca3af" }}>{sub.start ? fmt(parseDate(sub.start)) : "—"}</td>
                      <td style={{ padding: "6px 14px", fontSize: 11, color: "#9ca3af" }}>{sub.end ? fmt(parseDate(sub.end)) : "—"}</td>
                      <td style={{ padding: "6px 14px", fontSize: 11, color: "#9ca3af" }}>{sub.start && sub.end ? busyDays(sub.start, sub.end, new Set(holidays.map(h=>h.date))) + "d" : "—"}</td>
                      <td style={{ padding: "6px 14px", width: 110 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <ProgressBar value={sub.progress || 0} color={d.projectColor} height={3} />
                          <span style={{ fontSize: 10, color: "#9ca3af", minWidth: 26 }}>{sub.progress || 0}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "6px 14px" }} />
                    </tr>
                  ))}

                  {/* + Add subtask row at the bottom */}
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.01)" }}>
                    <td colSpan={10} style={{ padding: "4px 14px 6px 28px" }}>
                      <button onClick={() => onAddSubtask(proj, d)} style={{
                        background: "none", border: "1px dashed rgba(0,0,0,0.13)", borderRadius: 4,
                        color: "#9ca3af", padding: "2px 12px", cursor: "pointer",
                        fontSize: 10, fontFamily: "inherit", transition: "all 0.12s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = d.projectColor; e.currentTarget.style.color = d.projectColor; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.13)"; e.currentTarget.style.color = "#9ca3af"; }}
                      >+ Add subtask</button>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function SectionHeader({ children, noMargin }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: noMargin ? 0 : 16 }}>{children}</div>;
}

// --- TIMELINE ────────────────────────────────────────────────────────────────
const MIN_DAY_W = 20; const MAX_DAY_W = 32;
const D_ROW = 44;
const S_ROW = 36;
const TODAY = new Date("2026-05-20");
const totalDays = Math.ceil((TIMELINE_END - TIMELINE_START) / 86400000);

// Column widths for the left table
const COL_DEFAULTS = { num: 38, title: 280, start: 82, end: 82, dur: 48, deps: 88, assignees: 82, notes: 150 };
// LEFT_W is now computed dynamically from colWidths state

// Build a flat numbered index of all items across all projects
function buildRowIndex(projects) {
  const index = {}; // id -> rowNum
  const reverse = {}; // rowNum -> { id, projId, delId }
  let n = 1;
  projects.forEach(proj => {
    proj.deliverables.forEach(del => {
      index[del.id] = n;
      reverse[n] = { id: del.id, projId: proj.id, delId: null };
      n++;
      del.subtasks.forEach(sub => {
        index[sub.id] = n;
        reverse[n] = { id: sub.id, projId: proj.id, delId: del.id };
        n++;
      });
    });
  });
  return { index, reverse, total: n - 1 };
}


// ── CASCADE DATE HELPER ──────────────────────────────────────────────────────
// When a task's end date changes, snap all dependent tasks so they start the
// day after their predecessor ends, propagating through the chain.
function cascadeDates(projects, changedId, newEnd, holidays = []) {
  const holidaySet = new Set(holidays.map(h => h.date));

  // Advance a date to the next working day (skip weekends + holidays)
  function nextWorkingDay(dateStr) {
    let d = new Date(dateStr + "T00:00:00");
    while (holidaySet.has(d.toISOString().slice(0,10)) || d.getDay() === 0 || d.getDay() === 6) {
      d = new Date(d.getTime() + 86400000);
    }
    return d.toISOString().slice(0,10);
  }

  // Add n working days to a date string
  function addWorkDays(dateStr, n) {
    let d = new Date(dateStr + "T00:00:00");
    let added = 0;
    while (added < n) {
      d = new Date(d.getTime() + 86400000);
      const ds = d.toISOString().slice(0,10);
      if (d.getDay() !== 0 && d.getDay() !== 6 && !holidaySet.has(ds)) added++;
    }
    return d.toISOString().slice(0,10);
  }

  // Count working days between two date strings (inclusive)
  function workingDaysDuration(startStr, endStr) {
    let d = new Date(startStr + "T00:00:00");
    const end = new Date(endStr + "T00:00:00");
    let count = 0;
    while (d <= end) {
      const ds = d.toISOString().slice(0,10);
      if (d.getDay() !== 0 && d.getDay() !== 6 && !holidaySet.has(ds)) count++;
      d = new Date(d.getTime() + 86400000);
    }
    return Math.max(1, count);
  }

  // Build a flat map of all items
  const itemMap = {};
  projects.forEach(proj => {
    proj.deliverables.forEach(del => {
      itemMap[del.id] = { ...del };
      del.subtasks.forEach(sub => { itemMap[sub.id] = { ...sub }; });
    });
  });

  const rowIndex = buildRowIndex(projects);

  // Get dependency IDs from either the dependencies[] array or depsText string
  function getDeps(item) {
    // Prefer the explicit dependencies[] array
    if (item.dependencies && item.dependencies.length > 0) return item.dependencies;
    // Fall back to depsText numeric row numbers
    if (item.depsText) {
      return item.depsText.split(',').map(s => s.trim()).filter(Boolean).map(num => {
        const entry = rowIndex.reverse[parseInt(num)];
        return entry ? entry.id : null;
      }).filter(Boolean);
    }
    return [];
  }

  // Sanitize the changed item's end — push off holidays/weekends
  const adjustedEnd = nextWorkingDay(newEnd);
  itemMap[changedId] = { ...itemMap[changedId], end: adjustedEnd };

  const triggered = new Set([changedId]);
  let anyChange = true;

  while (anyChange) {
    anyChange = false;
    Object.values(itemMap).forEach(item => {
      const deps = getDeps(item);
      if (!deps.length || !deps.some(d => triggered.has(d))) return;

      const latestPredEnd = deps
        .map(d => itemMap[d] ? parseDate(itemMap[d].end) : null)
        .filter(Boolean)
        .reduce((max, d) => d > max ? d : max, new Date(0));

      if (latestPredEnd <= new Date(0)) return;

      // Start the day after predecessor ends, skipping weekends + holidays
      const dayAfter = new Date(latestPredEnd.getTime() + 86400000).toISOString().slice(0,10);
      const ns = nextWorkingDay(dayAfter);

      // Preserve working-day duration
      const dur = workingDaysDuration(item.start, item.end);
      const ne = addWorkDays(ns, dur - 1);

      triggered.add(item.id);

      if (ns !== item.start || ne !== item.end) {
        itemMap[item.id] = { ...itemMap[item.id], start: ns, end: ne };
        anyChange = true;
      }
    });
  }

  return projects.map(proj => ({
    ...proj,
    deliverables: proj.deliverables.map(del => {
      const u = itemMap[del.id];
      return {
        ...(u ? { ...del, start: u.start, end: u.end } : del),
        subtasks: del.subtasks.map(sub => {
          const us = itemMap[sub.id];
          return us ? { ...sub, start: us.start, end: us.end } : sub;
        }),
      };
    }),
  }));
}


function dayOffset(dateStr) {
  return Math.ceil((parseDate(dateStr) - TIMELINE_START) / 86400000);
}

function TimelineView({ projects, people, onEditItem, onAddDeliverable, onAddSubtask, onMarkDone, onSaveItem, holidays = [], onInsertSubtask, onReorderSubtasks, onDeleteSubtask, statusNotes = {}, onUpdateNote, onSaveProject, onOpenProject, clipboard, onCopySubtask, onCopyDeliverable, onPasteSubtask, onPasteDeliverable }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('planr_collapsed') || '{}'); } catch { return {}; }
  });
  const toggle = (id) => setCollapsed(c => {
    const next = { ...c, [id]: !c[id] };
    try { localStorage.setItem('planr_collapsed', JSON.stringify(next)); } catch {}
    return next;
  });
  const scrollRef    = useRef(null); // month header scroll sync
  const topBarRef    = useRef(null); // sticky top scrollbar
  const containerRef = useRef(null);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const toggleProjFilter = (id) => setSelectedProjects(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const visibleProjects = selectedProjects.length === 0 ? projects : projects.filter(p => selectedProjects.includes(p.id));
  const [DAY_W, setDayW] = useState(24);
  const [colWidths, setColWidths] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('planr_colWidths') || '{}');
      // Merge saved with defaults so new columns always appear
      return { ...COL_DEFAULTS, ...saved };
    } catch { return { ...COL_DEFAULTS }; }
  });

  // Persist colWidths to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem('planr_colWidths', JSON.stringify(colWidths)); } catch {}
  }, [colWidths]);

  const resetColWidths = () => {
    setColWidths({ ...COL_DEFAULTS });
    try { localStorage.removeItem('planr_colWidths'); } catch {}
  };
  const LEFT_W = Object.values(colWidths).reduce((a, b) => a + b, 0);
  const rowIndex = buildRowIndex(projects);

  // Drag-to-resize columns
  const dragRef = useRef(null);
  const startResizeCol = (colKey, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[colKey];
    const onMove = (mv) => {
      const delta = mv.clientX - startX;
      setColWidths(cw => ({ ...cw, [colKey]: Math.max(36, startW + delta) }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Auto-fit: compute DAY_W so timeline fills the available width
  useEffect(() => {
    const compute = () => {
      if (!containerRef.current) return;
      const available = containerRef.current.offsetWidth - LEFT_W - 20;
      const fit = Math.floor(available / totalDays);
      setDayW(Math.min(MAX_DAY_W, Math.max(MIN_DAY_W, fit)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [totalDays, LEFT_W]);

  // Build month + week markers
  const months = [];
  let cur = new Date(TIMELINE_START);
  while (cur < TIMELINE_END) {
    const start = new Date(cur);
    const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const end = nextMonth < TIMELINE_END ? nextMonth : TIMELINE_END;
    const days = Math.ceil((end - start) / 86400000);
    months.push({ label: fmtMonth(start), days, offset: Math.ceil((start - TIMELINE_START) / 86400000) });
    cur = nextMonth;
  }
  const weeks = [];
  let wd = new Date(TIMELINE_START);
  while (wd < TIMELINE_END) { weeks.push(Math.ceil((wd - TIMELINE_START) / 86400000)); wd = new Date(wd.getTime() + 7 * 86400000); }
  const todayOff = Math.ceil((TODAY - TIMELINE_START) / 86400000);

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayOff * DAY_W - 200);
  }, []);

  // Collect all IDs for dependency lookup across whole timeline
  const allItemsFlat = projects.flatMap(p => p.deliverables.flatMap(d => [
    { ...d, projectColor: p.color, projectName: p.name },
    ...d.subtasks.map(s => ({ ...s, projectColor: p.color, projectName: p.name }))
  ]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* Project filter pills — normal flow above the timeline box */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: fs(11), color: "#6b7280", fontWeight: 600 }}>Show:</span>
        <div onClick={() => setSelectedProjects([])} style={{
          padding: "3px 10px", borderRadius: 12, cursor: "pointer", fontSize: 11, fontWeight: 700,
          background: selectedProjects.length === 0 ? "rgba(0,0,0,0.1)" : "transparent",
          border: `1px solid ${selectedProjects.length === 0 ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.1)"}`,
          color: selectedProjects.length === 0 ? "#111827" : "#6b7280",
        }}>All Projects</div>
        {projects.map(p => (
          <div key={p.id} onClick={() => toggleProjFilter(p.id)} style={{
            padding: "3px 10px", borderRadius: 12, cursor: "pointer", fontSize: 11, fontWeight: 700,
            border: `1px solid ${selectedProjects.includes(p.id) ? p.color + "80" : "rgba(0,0,0,0.1)"}`,
            background: selectedProjects.includes(p.id) ? p.color + "18" : "transparent",
            color: selectedProjects.includes(p.id) ? p.color : "#6b7280",
          }}>{p.name}</div>
        ))}
      </div>

      {/*
        ── TIMELINE BOX ──────────────────────────────────────────────────────
        This is a self-contained scroll region. It fills remaining viewport
        height and scrolls vertically within itself. The column header sticks
        at the top of THIS box using position:sticky top:0, which works
        perfectly because the immediate scroll ancestor is this div.
        Horizontal scroll is handled inside TimelineBody and synced to the
        header via headerScrollRef / syncScroll.
      */}
      {/*
        ── TIMELINE BOX ────────────────────────────────────────────────────
        Single scroll owner for BOTH axes:
          overflowX: auto  → one horizontal scrollbar, header + rows move together
          overflowY: auto  → vertical scroll, sticky header stays pinned at top
        The sticky header sticks vertically (top:0) but scrolls horizontally
        with the content — no JS sync needed, no misalignment possible.
      */}
      <div
        ref={containerRef}
        style={{
          background: "#eceef2",
          border: "1px solid rgba(0,0,0,0.07)",
          borderRadius: 10,
          fontFamily: "inherit",
          height: "calc(100vh - 130px)",
          minHeight: 300,
          overflowY: "auto",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Min-width wrapper so content never wraps */}
        <div style={{ minWidth: LEFT_W + totalDays * DAY_W }}>

        {/* ── STICKY HEADER ROW — sticks vertically, scrolls horizontally ── */}
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          display: "flex",
          height: 38,
          flexShrink: 0,
          background: "#f0f2f5",
          borderBottom: "1px solid rgba(0,0,0,0.09)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          width: "100%",
        }}>
          {/* Left: column labels */}
          <div style={{ display: "flex", flexShrink: 0, background: "#f0f2f5", borderRight: "1px solid rgba(0,0,0,0.07)" }}>
            {[["#","num"],["Title","title"],["Start","start"],["End","end"],["Dur","dur"],["Deps","deps"],["Assigned To","assignees"],["Notes","notes"]].map(([label, key]) => (
              <div key={key} style={{ width: colWidths[key], position: "relative", padding: "0 8px", fontSize: fs(10), fontWeight: 700, color: "#6b7280", letterSpacing: "0.09em", flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.05)", whiteSpace: "nowrap", overflow: "hidden", userSelect: "none", display: "flex", alignItems: "center" }}>
                {label.toUpperCase()}
                <div onMouseDown={(e) => startResizeCol(key, e)} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 6, cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 2, height: 14, background: "rgba(0,0,0,0.15)", borderRadius: 1 }} />
                </div>
              </div>
            ))}
            <button onClick={resetColWidths} title="Reset column widths to defaults"
              style={{ marginLeft: 4, background: "none", border: "none", color: "#c4c9d4", cursor: "pointer", fontSize: 9, fontFamily: "inherit", padding: "0 6px", alignSelf: "center", whiteSpace: "nowrap" }}
              onMouseEnter={e => e.currentTarget.style.color = "#6b7280"}
              onMouseLeave={e => e.currentTarget.style.color = "#c4c9d4"}
            >↺</button>
          </div>
          {/* Right: month/date labels — naturally aligned, no sync needed */}
          <div style={{ flex: 1, position: "relative", height: "100%", width: totalDays * DAY_W }}>
            {months.map((m, i) => (
              <div key={i} style={{ position: "absolute", left: m.offset * DAY_W, width: m.days * DAY_W, height: "100%", display: "flex", alignItems: "center", paddingLeft: 8, fontSize: 10, fontWeight: 800, color: "#6b7280", letterSpacing: "0.1em", textTransform: "uppercase", borderRight: "1px solid rgba(0,0,0,0.06)" }}>{m.label}</div>
            ))}
            <div style={{ position: "absolute", left: todayOff * DAY_W, top: 0, bottom: 0, width: 2, background: BRAND_TEAL, opacity: 0.9 }} />
          </div>
        </div>




        {/* ── BODY — scrolls vertically inside the timeline box ── */}
        <TimelineBody
          projects={visibleProjects} people={people} collapsed={collapsed} toggle={toggle}
          weeks={weeks} todayOff={todayOff} allItemsFlat={allItemsFlat}
          onEditItem={onEditItem} headerScrollRef={scrollRef} topScrollRef={topBarRef}
          /* headerScrollRef/topScrollRef kept for API compat but scroll is now native */
          onAddDeliverable={onAddDeliverable} onAddSubtask={onAddSubtask}
          onMarkDone={onMarkDone} onSaveItem={onSaveItem} rowIndex={rowIndex} DAY_W={DAY_W}
          colWidths={colWidths} LEFT_W={LEFT_W} holidays={holidays}
          onInsertSubtask={onInsertSubtask} onReorderSubtasks={onReorderSubtasks} onDeleteSubtask={onDeleteSubtask}
          statusNotes={statusNotes} onUpdateNote={onUpdateNote}
          clipboard={clipboard} onCopySubtask={onCopySubtask} onCopyDeliverable={onCopyDeliverable}
          onPasteSubtask={onPasteSubtask} onPasteDeliverable={onPasteDeliverable}
        />
        </div>{/* end minWidth wrapper */}
      </div>{/* end containerRef timeline box */}
    </div>
  );
}

// ── Edge fade: shows ◀ / ▶ when content extends offscreen ──────────────────
function EdgeFade({ bodyRef, leftWidth }) {
  const [showLeft, setShowLeft]   = useState(false);
  const [showRight, setShowRight] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const check = () => {
      const sl = el.scrollLeft;
      const maxSl = el.scrollWidth - el.clientWidth;
      setShowLeft(sl > leftWidth + 4);
      setShowRight(sl < maxSl - 4);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [bodyRef, leftWidth]);

  const fade = (side) => ({
    position: "sticky",
    [side]: 0,
    top: 0,
    bottom: 0,
    width: 28,
    zIndex: 25,
    pointerEvents: "none",
    background: side === "left"
      ? "linear-gradient(to right, rgba(236,238,242,0.85), transparent)"
      : "linear-gradient(to left,  rgba(236,238,242,0.85), transparent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    alignSelf: "stretch",
    transition: "opacity 0.15s",
  });

  return (
    <>
      {showLeft  && <div style={{ ...fade("left"),  marginLeft:  leftWidth, position: "absolute", left: leftWidth, top: 0, bottom: 0 }}><span style={{ fontSize: 10, color: "#6b7280", opacity: 0.7 }}>◀</span></div>}
      {showRight && <div style={{ ...fade("right"), position: "absolute", right: 0, top: 0, bottom: 0 }}><span style={{ fontSize: 10, color: "#6b7280", opacity: 0.7 }}>▶</span></div>}
    </>
  );
}

function TimelineBody({ projects, people, collapsed, toggle, weeks, todayOff, allItemsFlat, onEditItem, headerScrollRef, topScrollRef, onAddDeliverable, onAddSubtask, onMarkDone, onSaveItem, rowIndex, DAY_W, colWidths, LEFT_W, holidays = [], onInsertSubtask, onReorderSubtasks, onDeleteSubtask, statusNotes = {}, onUpdateNote, onSaveProject, onOpenProject, clipboard, onCopySubtask, onCopyDeliverable, onPasteSubtask, onPasteDeliverable }) {
  const bodyRef  = useRef(null);
  const panState = useRef(null);

  // syncScroll removed — single scroll container handles both header and body

  // Shift+wheel → horizontal scroll
  const onWheel = (e) => {
    if (e.shiftKey) {
      e.preventDefault();
      bodyRef.current.scrollLeft += e.deltaY || e.deltaX;
    }
  };

  // ── Pan-drag via document events (never intercepts child clicks) ──────────
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const SKIP = new Set(["INPUT","TEXTAREA","SELECT","BUTTON","A"]);

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (SKIP.has(e.target.tagName)) return;
      if (e.target.closest("input,textarea,select,button,a,[data-no-pan]")) return;
      panState.current = { startX: e.clientX, startLeft: el.scrollLeft, dragging: false };
    };

    const onMouseMove = (e) => {
      if (!panState.current) return;
      const dx = panState.current.startX - e.clientX;
      if (!panState.current.dragging && Math.abs(dx) < 4) return;
      panState.current.dragging = true;
      el.style.cursor = "grabbing";
      el.scrollLeft = panState.current.startLeft + dx;
    };

    const onMouseUp = () => {
      if (panState.current?.dragging) el.style.cursor = "";
      panState.current = null;
    };

    el.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [LEFT_W]);

  return (
    <div
      data-timeline-body="1"
      ref={bodyRef}
      onWheel={onWheel}
      style={{ position: "relative" }}
    >
      <div style={{ minWidth: LEFT_W + totalDays * DAY_W, position: "relative" }}>
        {/* Holiday shading */}
        {holidays.map(h => {
          const off = Math.ceil((parseDate(h.date) - TIMELINE_START) / 86400000);
          if (off < 0 || off >= totalDays) return null;
          return (
            <div key={h.date} title={h.name} style={{
              position: "absolute", left: LEFT_W + off * DAY_W, top: 0, bottom: 0, width: DAY_W,
              background: "rgba(251,146,60,0.12)", borderLeft: "1px solid rgba(251,146,60,0.3)",
              pointerEvents: "none", zIndex: 1,
            }}>
              <div style={{ fontSize: 8, color: "#fb923c", fontWeight: 700, writingMode: "vertical-rl",
                transform: "rotate(180deg)", paddingBottom: 4, opacity: 0.7, position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%) rotate(180deg)" }}>
                {h.name}
              </div>
            </div>
          );
        })}
        {projects.map(proj => (
          <ProjectSection key={proj.id} proj={proj} people={people} collapsed={collapsed} toggle={toggle}
            weeks={weeks} todayOff={todayOff} allItemsFlat={allItemsFlat} onEditItem={onEditItem}
            onAddDeliverable={onAddDeliverable} onAddSubtask={onAddSubtask} onMarkDone={onMarkDone}
            onSaveItem={onSaveItem} rowIndex={rowIndex} DAY_W={DAY_W} colWidths={colWidths} LEFT_W={LEFT_W}
            onInsertSubtask={onInsertSubtask} onReorderSubtasks={onReorderSubtasks} onDeleteSubtask={onDeleteSubtask}
            statusNotes={statusNotes} onUpdateNote={onUpdateNote} holidays={holidays}
            clipboard={clipboard} onCopySubtask={onCopySubtask} onCopyDeliverable={onCopyDeliverable} onPasteSubtask={onPasteSubtask} onPasteDeliverable={onPasteDeliverable}
            onSaveProject={onSaveProject} onOpenProject={onOpenProject} />
        ))}
        {/* Today footer */}
        <div style={{ display: "flex", height: 22, background: "#e8eaee", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ width: LEFT_W, flexShrink: 0 }} />
          <div style={{ flex: 1, position: "relative", width: totalDays * DAY_W }}>
            <div style={{ position: "absolute", left: todayOff * DAY_W - 20, top: "50%", transform: "translateY(-50%)", background: BRAND_TEAL, color: BRAND_NAVY, fontSize: 9, fontWeight: 900, padding: "2px 7px", borderRadius: 3, letterSpacing: "0.08em" }}>TODAY</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectSection({ proj, people, collapsed, toggle, weeks, todayOff, allItemsFlat, onEditItem, onAddDeliverable, onAddSubtask, onMarkDone, onSaveItem, rowIndex, DAY_W, colWidths, LEFT_W, onInsertSubtask, onReorderSubtasks, onDeleteSubtask, statusNotes = {}, onUpdateNote, holidays = [], clipboard, onCopySubtask, onCopyDeliverable, onPasteSubtask, onPasteDeliverable, onSaveProject, onOpenProject }) {
  const isProjCollapsed = !!collapsed[proj.id];

  // Span the whole project across the chart for the summary bar
  const allDates = proj.deliverables.flatMap(d => [d.start, d.end]);
  const projStart = allDates.length ? allDates.reduce((a, b) => a < b ? a : b) : null;
  const projEnd   = allDates.length ? allDates.reduce((a, b) => a > b ? a : b) : null;
  const projStartOff = projStart ? dayOffset(projStart) : null;
  const projEndOff   = projEnd   ? dayOffset(projEnd)   : null;
  const projBarW = projStartOff !== null ? Math.max((projEndOff - projStartOff) * DAY_W, 8) : 0;

  const avgProgress = proj.deliverables.length
    ? Math.round(proj.deliverables.reduce((s, d) => s + d.progress, 0) / proj.deliverables.length)
    : 0;

  return (
    <div>
      {/* Project header row — clickable to collapse */}
      <div style={{ display: "flex", height: 36, background: isProjCollapsed ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.04)", borderBottom: "1px solid rgba(0,0,0,0.07)", alignItems: "center", cursor: "pointer" }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.045)"}
        onMouseLeave={e => e.currentTarget.style.background = isProjCollapsed ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.04)"}>
        <div style={{ width: LEFT_W, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 12px", gap: 8, borderRight: "1px solid rgba(0,0,0,0.06)", height: "100%" }}>
          {/* Collapse chevron — click to toggle */}
          <span onClick={() => toggle(proj.id)} style={{ fontSize: 10, color: "#6b7280", lineHeight: 1, width: 12, flexShrink: 0, transition: "transform 0.15s", display: "inline-block", transform: isProjCollapsed ? "rotate(-90deg)" : "rotate(0deg)", cursor: "pointer" }}>▼</span>
          <div onClick={() => toggle(proj.id)} style={{ width: 3, height: 16, background: proj.color, borderRadius: 2, flexShrink: 0, cursor: "pointer" }} />
          {/* Project name — click to open details modal */}
          <span onClick={() => { console.log("[PulseX] project click", proj.id); onOpenProject && onOpenProject(proj.id); }} style={{ fontSize: 11, fontWeight: 800, color: proj.color, letterSpacing: "0.05em", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", textDecorationLine: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2 }} title="View project details">{proj.name}</span>
          {/* Team member avatars */}
          {(proj.teamMemberIds||[]).slice(0,3).map(id => {
            const p = people.find(x => x.id === id); if (!p) return null;
            return <div key={id} title={p.name} style={{ width: 16, height: 16, borderRadius: "50%", background: p.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{p.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>;
          })}
          <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{proj.deliverables.length}d</span>
          {/* Owner avatar + picker */}
          {(() => {
            const owner = people.find(p => p.id === proj.ownerId);
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {owner && (
                  <div title={`Owner: ${owner.name}`} style={{ width: 16, height: 16, borderRadius: "50%", background: owner.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 800, color: "#fff" }}>
                    {owner.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </div>
                )}
                <select
                  value={proj.ownerId || ""}
                  onChange={e => onSaveProject && onSaveProject({ ...proj, ownerId: e.target.value || null })}
                  title="Set project owner"
                  style={{ fontSize: 9, border: "none", background: "transparent", color: owner ? owner.color : "#9ca3af", fontFamily: "inherit", cursor: "pointer", padding: 0, maxWidth: 70, fontWeight: 600 }}
                >
                  <option value="">Owner…</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name.split(" ")[0]}</option>)}
                </select>
              </div>
            );
          })()}
        </div>
        {/* + Deliverable button — sits outside the toggle click zone */}
        <div style={{ width: 0, overflow: "visible", position: "relative", zIndex: 2 }}>
          <button onClick={e => { e.stopPropagation(); onAddDeliverable(proj); }} title="Add deliverable" style={{
            position: "absolute", left: -86, top: "50%", transform: "translateY(-50%)",
            background: proj.color + "18", border: `1px solid ${proj.color}40`,
            color: proj.color, borderRadius: 4, padding: "1px 8px", cursor: "pointer",
            fontSize: 10, fontWeight: 800, fontFamily: "inherit", lineHeight: "16px", whiteSpace: "nowrap",
          }}>+ Deliverable</button>
        </div>
        {/* Chart area — shows summary bar when collapsed */}
        <div style={{ flex: 1, height: "100%", position: "relative", width: totalDays * DAY_W }} onClick={() => toggle(proj.id)}>
          {weeks.map(w => <div key={w} style={{ position: "absolute", left: w * DAY_W, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.035)" }} />)}
          <div style={{ position: "absolute", left: todayOff * DAY_W, top: 0, bottom: 0, width: 2, background: `${BRAND_TEAL}22` }} />
          {/* Summary span bar — always visible, more prominent when collapsed */}
          {projBarW > 0 && (
            <div style={{
              position: "absolute", left: projStartOff * DAY_W + 2, top: "50%", transform: "translateY(-50%)",
              width: projBarW - 4, height: isProjCollapsed ? 16 : 6, borderRadius: 3,
              background: isProjCollapsed
                ? `linear-gradient(90deg, ${proj.color}cc, ${proj.color}99)`
                : proj.color + "55",
              border: `1px solid ${proj.color}${isProjCollapsed ? "" : "99"}`,
              overflow: "hidden", transition: "height 0.15s, background 0.15s",
            }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${avgProgress}%`, background: "rgba(0,0,0," + (isProjCollapsed ? "0.25" : "0.15") + ")", borderRadius: 3 }} />
              {isProjCollapsed && (
                <div style={{ position: "relative", padding: "0 6px", fontSize: 9, fontWeight: 700, color: "#111827", lineHeight: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {proj.name} · {avgProgress}%
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Deliverables — hidden when project is collapsed */}
      {!isProjCollapsed && proj.deliverables.map(del => (
        <DeliverableRow key={del.id} del={del} proj={proj} people={people}
          collapsed={collapsed} toggle={toggle} weeks={weeks} todayOff={todayOff}
          allItemsFlat={allItemsFlat} onEditItem={onEditItem}
          onAddSubtask={() => onAddSubtask(proj, del)} onMarkDone={onMarkDone}
          onSaveItem={onSaveItem} rowIndex={rowIndex} DAY_W={DAY_W} colWidths={colWidths} LEFT_W={LEFT_W}
          onInsertSubtask={onInsertSubtask} onReorderSubtasks={onReorderSubtasks} onDeleteSubtask={onDeleteSubtask}
          statusNotes={statusNotes} onUpdateNote={onUpdateNote} holidays={holidays}
          clipboard={clipboard} onCopySubtask={onCopySubtask} onCopyDeliverable={onCopyDeliverable}
          onPasteSubtask={onPasteSubtask} onPasteDeliverable={onPasteDeliverable} />
      ))}

      {/* Empty state */}
      {!isProjCollapsed && proj.deliverables.length === 0 && (
        <div style={{ display: "flex", height: 44, alignItems: "center" }}>
          <div style={{ width: LEFT_W, flexShrink: 0, padding: "0 28px", borderRight: "1px solid rgba(0,0,0,0.06)" }}>
            <button onClick={() => onAddDeliverable(proj)} style={{
              background: "none", border: "1px dashed rgba(0,0,0,0.09)", borderRadius: 5,
              color: "#9ca3af", padding: "4px 12px", cursor: "pointer", fontSize: 11, fontFamily: "inherit",
            }}>+ Add first deliverable</button>
          </div>
          <div style={{ flex: 1 }} />
        </div>
      )}
    </div>
  );
}


// ─── CONTEXT MENU ────────────────────────────────────────────────────────────
function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} style={{
      position: 'fixed', left: x, top: y, zIndex: 2000,
      background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: 180, overflow: 'hidden',
    }}>
      {items.map((item, i) => item === 'divider'
        ? <div key={i} style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '2px 0' }} />
        : (
          <button key={i} onClick={() => { item.action(); onClose(); }} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '9px 14px', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 12, fontWeight: 500, color: item.danger ? '#f87171' : '#1f2937',
            fontFamily: 'inherit', textAlign: 'left',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{ fontSize: 13, color: item.danger ? '#f87171' : '#6b7280', width: 16 }}>{item.icon}</span>
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

function DeliverableRow({ del, proj, people, collapsed, toggle, weeks, todayOff, allItemsFlat, onEditItem, onAddSubtask, onMarkDone, onSaveItem, rowIndex, DAY_W, colWidths, LEFT_W, onInsertSubtask, onReorderSubtasks, onDeleteSubtask, statusNotes = {}, onUpdateNote, holidays = [], clipboard, onCopySubtask, onCopyDeliverable, onPasteSubtask, onPasteDeliverable }) {
  const isCollapsed = collapsed[del.id];
  const rowNum = rowIndex.index[del.id] || "?";
  const startOff = dayOffset(del.start);
  const endOff   = dayOffset(del.end);
  const barW = Math.max((endOff - startOff) * DAY_W, 8);

  const save = (patch) => {
    const merged = { ...del, ...patch };
    onSaveItem({ ...merged, projectId: proj.id, projectName: proj.name, projectColor: proj.color });
  };

  const depsDisplay = (del.depsText || "");
  const [ctxMenu, setCtxMenu] = useState(null);
  const [delCtxMenu, setDelCtxMenu] = useState(null);
  const [dragState, setDragState] = useState({ dragIdx: null, overIdx: null });
  const dragRef = useRef(null); // { startY, idx, rowHeight }

  const handleSubtaskContextMenu = (e, subIdx) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, subIdx });
  };

  const startDrag = (e, idx) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const rowEls = e.currentTarget.closest('[data-subtask-list]')?.querySelectorAll('[data-subtask-row]');
    const rowH = rowEls?.[0]?.getBoundingClientRect().height || 32;
    dragRef.current = { startY: e.clientY, idx, rowH };
    setDragState({ dragIdx: idx, overIdx: idx });

    const onMove = (ev) => {
      if (!dragRef.current) return;
      const dy = ev.clientY - dragRef.current.startY;
      const newOver = Math.max(0, Math.min(del.subtasks.length - 1,
        dragRef.current.idx + Math.round(dy / dragRef.current.rowH)));
      setDragState(s => s.overIdx !== newOver ? { ...s, overIdx: newOver } : s);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (dragRef.current) {
        const { idx: from } = dragRef.current;
        setDragState(s => {
          const to = s.overIdx;
          if (to !== null && to !== from) {
            const newOrder = [...del.subtasks];
            const [moved] = newOrder.splice(from, 1);
            newOrder.splice(to, 0, moved);
            onReorderSubtasks(proj.id, del.id, newOrder);
          }
          return { dragIdx: null, overIdx: null };
        });
        dragRef.current = null;
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  const depArrows = (del.dependencies || []).map(depId => {
    const dep = allItemsFlat.find(x => x.id === depId);
    if (!dep) return null;
    return { depEndOff: dayOffset(dep.end), thisStartOff: startOff, key: depId };
  }).filter(Boolean);

  return (
    <div>
      {/* Deliverable row — right-click for copy/paste */}
      {delCtxMenu && (
        <ContextMenu x={delCtxMenu.x} y={delCtxMenu.y} onClose={() => setDelCtxMenu(null)} items={[
          { icon: "⎘", label: "Copy deliverable (with subtasks)", action: () => onCopyDeliverable && onCopyDeliverable(del) },
          { icon: "⎘", label: "Copy subtasks only", action: () => { del.subtasks.forEach(s => onCopySubtask && onCopySubtask(s)); } },
          ...(clipboard?.type === "deliverable" ? [
            "divider",
            { icon: "⊞", label: `Paste "${clipboard.data.title.slice(0,22)}…" into ${proj.name}`, action: () => onPasteDeliverable && onPasteDeliverable(proj.id) },
          ] : []),
          ...(clipboard?.type === "subtask" ? [
            "divider",
            { icon: "⊞", label: `Paste "${clipboard.data.title.slice(0,22)}…" as subtask`, action: () => onPasteSubtask && onPasteSubtask(proj.id, del.id) },
          ] : []),
        ]} />
      )}
      <div style={{ display: "flex", height: D_ROW, borderBottom: "1px solid rgba(0,0,0,0.05)", alignItems: "center", background: "rgba(245,158,11,0.03)", position: "relative" }}
        onContextMenu={e => { e.preventDefault(); setDelCtxMenu({ x: e.clientX, y: e.clientY }); }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(245,158,11,0.06)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(245,158,11,0.03)"}>
        {/* Row # */}
        <LeftCell width={colWidths.num} center>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af" }}>{rowNum}</span>
        </LeftCell>

        {/* Title */}
        <LeftCell width={colWidths.title}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <CheckButton isDone={del.status === "Done"} onClick={() => onMarkDone(proj.id, del.id, null)} />
            {del.status === "Not Started" && (
              <button onClick={e => { e.stopPropagation(); save({ status: "In Progress" }); }} title="Start task"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#34d399", fontSize: 11, padding: 0, lineHeight: 1, flexShrink: 0 }}>▶</button>
            )}
            <button onClick={() => toggle(del.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 11, padding: 0, lineHeight: 1, flexShrink: 0 }}>
              {isCollapsed ? "▸" : "▾"}
            </button>
            <div style={{ width: 3, height: 14, background: proj.color, borderRadius: 1, flexShrink: 0 }} />
            <span onClick={() => onEditItem({ ...del, projectId: proj.id, projectName: proj.name, projectColor: proj.color })} style={{ fontSize: fs(11), fontWeight: 700, color: del.status === "Done" ? "#9ca3af" : "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textDecoration: del.status === "Done" ? "line-through" : "none", cursor: "pointer" }} title={"Click to edit: " + del.title}>{del.title}</span>
            <button onClick={onAddSubtask} title="Add subtask" style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = proj.color}
              onMouseLeave={e => e.currentTarget.style.color = "#9ca3af"}
            >+</button>
          </div>
          <StatusBadge status={del.status} small />
        </LeftCell>



        {/* Start */}
        <LeftCell width={colWidths.start}>
          <InlineDate value={del.start} onChange={v => save({ start: v })} />
        </LeftCell>

        {/* End */}
        <LeftCell width={colWidths.end}>
          <InlineDate value={del.end} onChange={v => save({ end: v })} />
        </LeftCell>

        {/* Duration (read-only, auto from dates) */}
        <LeftCell width={colWidths.dur}>
          <span style={{ fontSize: 10, color: "#6b7280", padding: "2px 3px" }} title="Business days">{busyDays(del.start, del.end, new Set((holidays||[]).map(h=>h.date)))}d</span>
        </LeftCell>

        {/* Dependencies */}
        <LeftCell width={colWidths.deps}>
          <InlineDeps deps={del.dependencies || []} rowIndex={rowIndex} onChange={ids => save({ dependencies: ids })} />
        </LeftCell>

        {/* Assignees — editable only when deliverable has no subtasks (leaf work item) */}
        <LeftCell width={colWidths.assignees}>
          {del.subtasks && del.subtasks.length > 0
            ? <span style={{ fontSize: 10, color: "#d1d5db", padding: "2px 4px", fontStyle: "italic" }} title="Assign to subtasks instead">—</span>
            : <InlineAssignees assignees={del.assignees || []} people={people} onChange={v => save({ assignees: v })} />
          }
        </LeftCell>
        <InlineNoteCell
          width={colWidths.notes}
          note={statusNotes[`${proj.id}::${del.id}`] || ""}
          onChange={onUpdateNote ? (text) => onUpdateNote(`${proj.id}::${del.id}`, text) : null}
          color={proj.color}
          last
        />

        {/* Chart */}
        <div style={{ flex: 1, height: "100%", position: "relative", width: totalDays * DAY_W }}>
          {weeks.map(w => <div key={w} style={{ position: "absolute", left: w * DAY_W, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.04)" }} />)}
          <div style={{ position: "absolute", left: todayOff * DAY_W, top: 0, bottom: 0, width: 2, background: `${BRAND_TEAL}22` }} />
          {depArrows.map(({ depEndOff, thisStartOff, key }) => {
            const x1 = depEndOff * DAY_W; const x2 = thisStartOff * DAY_W;
            const midY = D_ROW / 2;
            return (
              <svg key={key} style={{ position: "absolute", left: 0, top: 0, width: totalDays * DAY_W, height: D_ROW, pointerEvents: "none", overflow: "visible" }}>
                <path d={`M ${x1} ${midY} C ${(x1+x2)/2} ${midY}, ${(x1+x2)/2} ${midY}, ${x2} ${midY}`} stroke={BRAND_TEAL} strokeWidth={1.5} fill="none" strokeDasharray="4 3" opacity={0.6} />
                <polygon points={`${x2},${midY} ${x2-5},${midY-3} ${x2-5},${midY+3}`} fill={BRAND_TEAL} opacity={0.6} />
              </svg>
            );
          })}
          <div onClick={() => onEditItem({ ...del, projectId: proj.id, projectName: proj.name, projectColor: proj.color })}
            style={{ position: "absolute", left: startOff * DAY_W + 2, top: "50%", transform: "translateY(-50%)",
              width: barW - 4, height: 24, borderRadius: 5, cursor: "pointer", overflow: "hidden",
              background: `linear-gradient(90deg, ${proj.color}cc, ${proj.color}aa)`,
              border: `1.5px solid ${proj.color}`, boxShadow: `0 1px 4px ${proj.color}40`,
            }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${del.progress}%`, background: "rgba(0,0,0,0.2)", borderRadius: 5 }} />
            <div style={{ position: "relative", padding: "0 7px", fontSize: 10, fontWeight: 700, color: "#fff", lineHeight: "24px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {del.title}
            </div>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div data-subtask-list>
          {del.subtasks.map((sub, subIdx) => (
            <div key={sub.id}
              data-subtask-row
              onContextMenu={e => handleSubtaskContextMenu(e, subIdx)}
              style={{
                opacity: dragState.dragIdx === subIdx ? 0.35 : 1,
                outline: dragState.overIdx === subIdx && dragState.dragIdx !== null && dragState.dragIdx !== subIdx
                  ? `2px solid ${BRAND_TEAL}` : 'none',
                outlineOffset: -2,
                transition: 'opacity 0.1s',
                cursor: dragState.dragIdx !== null ? 'grabbing' : 'default',
              }}
            >
              <SubtaskRow sub={sub} del={del} proj={proj} people={people}
                weeks={weeks} todayOff={todayOff} allItemsFlat={allItemsFlat} onEditItem={onEditItem}
                onMarkDone={onMarkDone} onSaveItem={onSaveItem} rowIndex={rowIndex} DAY_W={DAY_W} colWidths={colWidths} LEFT_W={LEFT_W}
                onInsertSubtask={onInsertSubtask} onReorderSubtasks={onReorderSubtasks} onDeleteSubtask={onDeleteSubtask}
                onDragHandlePointerDown={(e) => startDrag(e, subIdx)} holidays={holidays} />
            </div>
          ))}
        </div>
      )}
      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)} items={[
          { icon: '↑', label: 'Insert subtask above', action: () => {
            const afterId = ctxMenu.subIdx > 0 ? del.subtasks[ctxMenu.subIdx - 1].id : null;
            const newSub = { id: 's_' + Date.now(), title: 'New subtask', status: 'Not Started', priority: 'Medium', assignees: [], start: del.start, end: del.end, progress: 0, dependencies: [], department: '', effort: 'M' };
            onInsertSubtask(proj.id, del.id, afterId, newSub);
          }},
          { icon: '↓', label: 'Insert subtask below', action: () => {
            const afterId = del.subtasks[ctxMenu.subIdx]?.id || null;
            const newSub = { id: 's_' + Date.now(), title: 'New subtask', status: 'Not Started', priority: 'Medium', assignees: [], start: del.start, end: del.end, progress: 0, dependencies: [], department: '', effort: 'M' };
            onInsertSubtask(proj.id, del.id, afterId, newSub);
          }},
          'divider',
          { icon: '⎘', label: 'Copy this subtask', action: () => {
            const sub = del.subtasks[ctxMenu.subIdx];
            if (sub && onCopySubtask) onCopySubtask(sub);
          }},
          ...(clipboard?.type === 'subtask' ? [
            { icon: '⊞', label: `Paste "${(clipboard.data.title || '').slice(0,22)}…" above`, action: () => {
              const afterId = ctxMenu.subIdx > 0 ? del.subtasks[ctxMenu.subIdx - 1].id : null;
              onPasteSubtask && onPasteSubtask(proj.id, del.id, afterId);
            }},
            { icon: '⊞', label: `Paste "${(clipboard.data.title || '').slice(0,22)}…" below`, action: () => {
              const afterId = del.subtasks[ctxMenu.subIdx]?.id || null;
              onPasteSubtask && onPasteSubtask(proj.id, del.id, afterId);
            }},
          ] : []),
          'divider',
          { icon: '⊗', label: 'Delete subtask', danger: true, action: () => {
            const sub = del.subtasks[ctxMenu.subIdx];
            if (sub && window.confirm('Delete "' + sub.title + '"?')) onDeleteSubtask(proj.id, del.id, sub.id);
          }},
        ]} />
      )}
      {!isCollapsed && del.subtasks.length === 0 && (
        <div style={{ display: "flex", height: 30, alignItems: "center", background: "rgba(0,0,0,0.02)", borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
          <div style={{ width: LEFT_W, flexShrink: 0, paddingLeft: 36, borderRight: "1px solid rgba(0,0,0,0.05)" }}>
            <button onClick={onAddSubtask} style={{ background: "none", border: "1px dashed rgba(0,0,0,0.1)", borderRadius: 4, color: "#9ca3af", padding: "2px 10px", cursor: "pointer", fontSize: 10, fontFamily: "inherit" }}>+ Add subtask</button>
          </div>
          <div style={{ flex: 1 }} />
        </div>
      )}
    </div>
  );
}

function SubtaskRow({ sub, del, proj, people, weeks, todayOff, allItemsFlat, onEditItem, onMarkDone, onSaveItem, rowIndex, DAY_W, colWidths, LEFT_W, onInsertSubtask, onReorderSubtasks, onDeleteSubtask, onDragHandlePointerDown, holidays = [] }) {
  const m = statusMeta[sub.status] || statusMeta["Not Started"];
  const rowNum = rowIndex.index[sub.id] || "?";
  const startOff = dayOffset(sub.start);
  const endOff   = dayOffset(sub.end);
  const barW = Math.max((endOff - startOff) * DAY_W, 6);

  const save = (patch) => {
    const merged = { ...sub, ...patch };
    onSaveItem({ ...merged, projectId: proj.id, projectName: proj.name, projectColor: proj.color, deliverableId: del.id });
  };

  const depArrows = (sub.dependencies || []).map(depId => {
    const dep = allItemsFlat.find(x => x.id === depId);
    if (!dep) return null;
    return { depEndOff: dayOffset(dep.end), thisStartOff: startOff, key: depId };
  }).filter(Boolean);

  return (
    <div style={{ display: "flex", height: S_ROW, borderBottom: "1px solid rgba(0,0,0,0.03)", alignItems: "center",
        background: (() => { const t=new Date().toLocaleDateString('en-CA'); return sub.end&&sub.end<t&&sub.status==="In Progress"?"rgba(239,68,68,0.18)":sub.end&&sub.end<t&&sub.status!=="Done"?"rgba(239,68,68,0.09)":sub.end&&sub.end===t&&sub.status!=="Done"?"rgba(251,146,60,0.16)":"rgba(0,0,0,0.025)"; })(),
        borderLeft: (() => { const t=new Date().toLocaleDateString('en-CA'); return sub.end&&sub.end<t&&sub.status==="In Progress"?"3px solid #ef4444":sub.end&&sub.end===t&&sub.status!=="Done"?"3px solid #f97316":"none"; })(),
      }}
      onMouseEnter={e => { const t=new Date().toLocaleDateString('en-CA'); e.currentTarget.style.background=sub.end&&sub.end<t&&sub.status==="In Progress"?"rgba(239,68,68,0.24)":sub.end&&sub.end<t&&sub.status!=="Done"?"rgba(239,68,68,0.13)":"rgba(0,0,0,0.04)"; }}
      onMouseLeave={e => { const t=new Date().toLocaleDateString('en-CA'); e.currentTarget.style.background=sub.end&&sub.end<t&&sub.status==="In Progress"?"rgba(239,68,68,0.18)":sub.end&&sub.end<t&&sub.status!=="Done"?"rgba(239,68,68,0.09)":sub.end&&sub.end===t&&sub.status!=="Done"?"rgba(251,146,60,0.16)":"rgba(0,0,0,0.025)"; }}>

      {/* Row # */}
      <LeftCell width={colWidths.num} center>
        <span style={{ fontSize: 9, color: "#9ca3af" }}>{rowNum}</span>
      </LeftCell>

      {/* Title */}
      <LeftCell width={colWidths.title}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 18 }}>
          <div style={{ width: 10, height: 1, background: "rgba(0,0,0,0.1)", flexShrink: 0 }} />
          {/* Drag handle */}
          <span onPointerDown={onDragHandlePointerDown} style={{ cursor: "grab", color: "#9ca3af", fontSize: 13, flexShrink: 0, lineHeight: 1, paddingRight: 2, touchAction: "none", userSelect: "none" }} title="Drag to reorder">⠿</span>
          <CheckButton isDone={sub.status === "Done"} onClick={() => onMarkDone(proj.id, del.id, sub.id)} />
          {sub.status === "Not Started" && (
            <button onClick={e => { e.stopPropagation(); save({ status: "In Progress" }); }} title="Start task"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#34d399", fontSize: 10, padding: 0, lineHeight: 1, flexShrink: 0 }}>▶</button>
          )}
          <span onClick={() => onEditItem({ ...sub, projectId: proj.id, projectName: proj.name, projectColor: proj.color, deliverableId: del.id, delTitle: del.title })} style={{ fontSize: fs(11), color: sub.status === "Done" ? "#9ca3af" : "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: sub.status === "Done" ? "line-through" : "none", flex: 1, cursor: "pointer" }} title={"Click to edit · Right-click for options"}>{sub.title}</span>
        </div>
      </LeftCell>

      {/* Start */}
      <LeftCell width={colWidths.start}>
        <InlineDate value={sub.start} onChange={v => save({ start: v })} small />
      </LeftCell>

      {/* End */}
      <LeftCell width={colWidths.end}>
        <InlineDate value={sub.end} onChange={v => save({ end: v })} small />
      </LeftCell>

      {/* Duration */}
      <LeftCell width={colWidths.dur}>
        <span style={{ fontSize: 10, color: "#9ca3af", padding: "2px 3px" }} title="Business days">{busyDays(sub.start, sub.end, new Set((holidays||[]).map(h=>h.date)))}d</span>
      </LeftCell>

      {/* Dependencies */}
      <LeftCell width={colWidths.deps}>
        <InlineDeps deps={sub.dependencies || []} rowIndex={rowIndex} onChange={ids => save({ dependencies: ids })} />
      </LeftCell>

      {/* Assignees */}
      <LeftCell width={colWidths.assignees}>
        <InlineAssignees assignees={sub.assignees} people={people} onChange={v => save({ assignees: v })} />
      </LeftCell>
      <InlineNoteCell
        width={colWidths.notes}
        note={""}
        onChange={null}
        color={proj.color}
        last
        small
      />

      {/* Chart */}
      <div style={{ flex: 1, height: "100%", position: "relative", width: totalDays * DAY_W }}>
        {weeks.map(w => <div key={w} style={{ position: "absolute", left: w * DAY_W, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.025)" }} />)}
        <div style={{ position: "absolute", left: todayOff * DAY_W, top: 0, bottom: 0, width: 2, background: `${BRAND_TEAL}15` }} />
        {depArrows.map(({ depEndOff, thisStartOff, key }) => {
          const x1 = depEndOff * DAY_W; const x2 = thisStartOff * DAY_W;
          const midY = S_ROW / 2;
          return (
            <svg key={key} style={{ position: "absolute", left: 0, top: 0, width: totalDays * DAY_W, height: S_ROW, pointerEvents: "none", overflow: "visible" }}>
              <path d={`M ${x1} ${midY} C ${(x1+x2)/2} ${midY}, ${(x1+x2)/2} ${midY}, ${x2} ${midY}`} stroke="#6b7280" strokeWidth={1.2} fill="none" strokeDasharray="3 3" />
              <polygon points={`${x2},${midY} ${x2-4},${midY-2.5} ${x2-4},${midY+2.5}`} fill="#6b7280" />
            </svg>
          );
        })}
        <div style={{ position: "absolute", left: startOff * DAY_W + 2, top: "50%", transform: "translateY(-50%)",
          width: barW - 4, height: 16, borderRadius: 3, overflow: "hidden", cursor: "pointer",
          background: m.color + "30", border: `1px solid ${m.color}bb` }}
          onClick={() => onEditItem({ ...sub, projectId: proj.id, projectName: proj.name, projectColor: proj.color, deliverableId: del.id })}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${sub.progress}%`, background: "rgba(0,0,0,0.15)" }} />
          <div style={{ position: "relative", padding: "0 5px", fontSize: 9, fontWeight: 600, color: "#374151", lineHeight: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {sub.title}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── INLINE NOTE CELL ────────────────────────────────────────────────────────
function InlineNoteCell({ width, note, onChange, color, last, small }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);
  const ref = useRef(null);

  useEffect(() => { setDraft(note); }, [note]);

  const commit = () => {
    setEditing(false);
    if (onChange && draft !== note) onChange(draft);
  };

  const fontSize = small ? 9 : 10;

  return (
    <div style={{
      width, flexShrink: 0, padding: "0 8px", display: "flex", alignItems: "center",
      borderRight: last ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(0,0,0,0.04)",
      height: "100%", overflow: "hidden", minWidth: 0,
    }}>
      {editing ? (
        <textarea
          ref={ref}
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Escape") { setDraft(note); setEditing(false); } if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); } }}
          style={{
            width: "100%", border: `1px solid ${color}60`, borderRadius: 4, padding: "3px 6px",
            fontSize, fontFamily: "inherit", resize: "none", height: 48, outline: "none",
            background: "#fff", color: "#1f2937", lineHeight: 1.4,
          }}
        />
      ) : (
        <div
          onClick={() => onChange && setEditing(true)}
          style={{
            fontSize, color: note ? "#374151" : "#c4c9d4", lineHeight: 1.4,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            cursor: onChange ? "pointer" : "default", width: "100%",
            padding: "2px 4px", borderRadius: 3,
            background: note ? "transparent" : "transparent",
          }}
          title={note || (onChange ? "Click to add note" : "")}
        >
          {note || (onChange ? <span style={{ color: "#d1d5db", fontSize: fontSize - 1 }}>+ note</span> : null)}
        </div>
      )}
    </div>
  );
}

function LeftCell({ width, children, last, center }) {
  return (
    <div style={{
      width, flexShrink: 0, padding: "0 4px", display: "flex", flexDirection: "column",
      justifyContent: "center", gap: 2,
      borderRight: last ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(0,0,0,0.05)",
      height: "100%", alignItems: center ? "center" : "flex-start", overflow: "visible",
    }}>{children}</div>
  );
}

function InlineDate({ value, onChange, small }) {
  const [editing, setEditing] = useState(false);
  if (editing) return (
    <input type="date" defaultValue={value} autoFocus
      onBlur={e => { onChange(e.target.value); setEditing(false); }}
      style={{ fontSize: 10, border: `1px solid ${BRAND_TEAL}`, borderRadius: 3, padding: "1px 3px",
        background: "#fff8f0", color: "#111827", fontFamily: "inherit", width: "100%", outline: "none" }} />
  );
  return (
    <span onClick={() => setEditing(true)} title="Click to edit"
      style={{ fontSize: small ? 10 : 11, color: "#374151", cursor: "text", padding: "2px 3px",
        borderRadius: 3, border: "1px solid transparent", display: "block", width: "100%",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = BRAND_TEAL}
      onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
    >{value ? fmt(parseDate(value)) : "—"}</span>
  );
}

function InlineDeps({ deps = [], rowIndex, onChange }) {
  const toDisplay = (ids) => (ids || [])
    .map(id => rowIndex?.index?.[id])
    .filter(Boolean)
    .join(", ");
  const fromDisplay = (text) => text.split(",").map(s => s.trim()).filter(Boolean)
    .map(num => rowIndex?.reverse?.[parseInt(num)]?.id)
    .filter(Boolean);

  const [editing, setEditing] = useState(false);
  const display = toDisplay(deps);

  if (editing) return (
    <input
      autoFocus
      defaultValue={display}
      placeholder="e.g. 3, 5"
      onBlur={e => { onChange(fromDisplay(e.target.value)); setEditing(false); }}
      onKeyDown={e => {
        if (e.key === "Enter") { onChange(fromDisplay(e.target.value)); setEditing(false); }
        if (e.key === "Escape") { setEditing(false); }
      }}
      style={{ fontSize: 10, border: `2px solid ${BRAND_TEAL}`, borderRadius: 3,
        padding: "2px 4px", background: "#fffbf0", color: "#111827",
        fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" }}
    />
  );
  return (
    <span onClick={() => setEditing(true)} title="Click to edit — row numbers e.g. 3, 5"
      style={{ fontSize: 10, color: display ? "#374151" : "#9ca3af", cursor: "text",
        padding: "2px 3px", borderRadius: 3, border: "1px solid transparent",
        display: "block", width: "100%", whiteSpace: "nowrap",
        overflow: "hidden", textOverflow: "ellipsis" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = BRAND_TEAL}
      onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
    >{display || "—"}</span>
  );
}

function InlineAssignees({ assignees, onChange, people }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const [popPos, setPopPos] = useState({ top: 0, left: 0 });

  const toggle = (id) => onChange(assignees.includes(id) ? assignees.filter(x => x !== id) : [...assignees, id]);

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Try below first, flip above if not enough space
      const spaceBelow = window.innerHeight - rect.bottom;
      const popH = people.length * 40 + 50;
      const top = spaceBelow > popH ? rect.bottom + 4 : rect.top - popH - 4;
      setPopPos({ top, left: rect.left });
    }
    setOpen(o => !o);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (triggerRef.current && !triggerRef.current.closest('[data-assignee-popup]') && !e.target.closest('[data-assignee-popup]')) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div style={{ position: "relative" }} ref={triggerRef}>
      <div onClick={handleOpen} style={{ display: "flex", alignItems: "center", cursor: "pointer", gap: 2 }}>
        {assignees.length === 0
          ? <span style={{ fontSize: 9, color: "#9ca3af", border: "1px dashed rgba(0,0,0,0.2)", borderRadius: 8, padding: "2px 7px", whiteSpace: "nowrap" }}>+ Assign</span>
          : assignees.slice(0, 3).map(id => { const p = people.find(x => x.id === id); return p ? <div key={id} style={{ marginRight: -5 }}><Avatar person={p} size={20} /></div> : null; })
        }
        {assignees.length > 3 && <span style={{ fontSize: 9, color: "#6b7280", marginLeft: 8 }}>+{assignees.length-3}</span>}
      </div>
      {open && typeof document !== 'undefined' && (() => {
        const popup = (
          <div data-assignee-popup="1" style={{
            position: "fixed", top: popPos.top, left: popPos.left, zIndex: 9999,
            background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)", padding: 10,
            display: "flex", flexDirection: "column", gap: 4, minWidth: 200,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4, padding: "0 4px" }}>Assign To</div>
            {people.map(p => (
              <div key={p.id} onClick={() => toggle(p.id)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
                borderRadius: 7, cursor: "pointer", userSelect: "none",
                background: assignees.includes(p.id) ? p.color + "18" : "#f7f8fa",
                border: `1.5px solid ${assignees.includes(p.id) ? p.color + "70" : "transparent"}`,
                transition: "all 0.1s",
              }}>
                <Avatar person={p} size={26} />
                <span style={{ fontSize: 13, color: "#1f2937", fontWeight: assignees.includes(p.id) ? 700 : 400, flex: 1 }}>{p.name}</span>
                {assignees.includes(p.id) && <span style={{ color: p.color, fontSize: 14, fontWeight: 900 }}>✓</span>}
              </div>
            ))}
            <div onClick={() => setOpen(false)} style={{
              borderTop: "1px solid rgba(0,0,0,0.07)", marginTop: 4, paddingTop: 6,
              textAlign: "center", fontSize: fs(11), color: "#6b7280", cursor: "pointer", fontWeight: 600,
            }}>Done</div>
          </div>
        );
        // Use a portal-like approach via dangerouslySetInnerHTML alternative — render inline but fixed
        return popup;
      })()}
    </div>
  );
}

// --- PEOPLE VIEW ──────────────────────────────────────────────────────────────
function PeopleView({ projects, people, onEditItem, onMarkDone, onSaveItem, holidays = [], pto = [] }) {
  const allSubtasks = projects.flatMap(p => p.deliverables.flatMap(d =>
    d.subtasks.map(s => ({ ...s, projectId: p.id, projectName: p.name, projectColor: p.color, deliverableId: d.id }))
  ));
  // Leaf deliverables (no subtasks) are also executable work items
  const allLeafDeliverables = projects.flatMap(p =>
    p.deliverables
      .filter(d => !d.subtasks || d.subtasks.length === 0)
      .map(d => ({ ...d, projectId: p.id, projectName: p.name, projectColor: p.color, deliverableId: null, isSubtask: false }))
  );
  // Exclude Done tasks from active schedule
  const allActive = [...allSubtasks, ...allLeafDeliverables].filter(t => t.status !== "Done");

  // ── Multi-select state ────────────────────────────────────────────────────
  // "all" = view-all mode, array = specific people selected
  const [viewMode, setViewMode] = useState("single"); // "single" | "compare"
  const [selected, setSelected]     = useState(people[0]?.id || "");
  const [compared, setCompared]     = useState([]); // IDs for compare mode
  const [collapsed, setCollapsed]   = useState({});  // personId → bool

  const toggleCollapse = (id) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  const toggleCompare  = (id) => setCompared(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const GDAY_W = 18;
  const G_ROW  = 28;
  const holidaySet = new Set(holidays.map(h => h.date));

  // ── Workload badge ────────────────────────────────────────────────────────
  const loadBadge = (items) => {
    const hrs = items.reduce((s,t) => s + effortHours(t.effort), 0);
    return classifyLoad(hrs, WEEKLY_HOURS);
  };

  // ── PersonPanel ────────────────────────────────────────────────────────────
  const PersonPanel = ({ person, compact = false }) => {
    const myItems   = allActive.filter(t => (t.assignees||[]).includes(person.id));
    const byStatus  = STATUSES.reduce((a,s) => ({ ...a, [s]: myItems.filter(t=>t.status===s) }), {});
    const isCollapsed = collapsed[person.id];
    const load = loadBadge(myItems);

    // Gantt date range
    const myDates  = myItems.flatMap(t => [t.start, t.end]).filter(Boolean).sort();
    const gStart   = myDates.length ? new Date(myDates[0]+"T00:00:00") : TIMELINE_START;
    const gEnd     = myDates.length ? new Date(myDates[myDates.length-1]+"T00:00:00") : TIMELINE_END;
    const ganttDays = Math.max(14, Math.ceil((gEnd - gStart)/86400000) + 14);
    const gOff = (ds) => Math.ceil((parseDate(ds) - gStart) / 86400000);

    // Drag-to-reschedule
    const startDrag = (item, e) => {
      e.preventDefault();
      const startX = e.clientX;
      const dur = Math.ceil((parseDate(item.end) - parseDate(item.start)) / 86400000);
      const onMove = (mv) => {
        const d = Math.round((mv.clientX - startX) / GDAY_W);
        if (!d) return;
        const ns = new Date(parseDate(item.start).getTime() + d*86400000).toISOString().slice(0,10);
        const ne = new Date(parseDate(item.start).getTime() + (d+dur)*86400000).toISOString().slice(0,10);
        onSaveItem({ ...item, start: ns, end: ne });
      };
      const onUp = () => { document.removeEventListener("mousemove",onMove); document.removeEventListener("mouseup",onUp); };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };

    return (
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden" }}>
        {/* ── Person header — always visible, sticky in compare mode ── */}
        <div
          onClick={() => compact && toggleCollapse(person.id)}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
            background: isCollapsed ? "rgba(0,0,0,0.02)" : person.color + "0d",
            borderBottom: isCollapsed ? "none" : "1px solid rgba(0,0,0,0.06)",
            cursor: compact ? "pointer" : "default",
            position: compact ? "sticky" : "static", top: 0, zIndex: 5,
          }}
        >
          <Avatar person={person} size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1f2937" }}>{person.name}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
              {STATUSES.map(s => { const n = (byStatus[s]||[]).length; if (!n) return null;
                return <span key={s} style={{ fontSize: 10, color: (statusMeta[s]||statusMeta["Not Started"]).color, fontWeight: 700 }}>{n} {s}</span>; })}
              {myItems.length === 0 && <span style={{ fontSize: 10, color: "#9ca3af" }}>No active tasks</span>}
            </div>
          </div>
          {/* Workload badge */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: load.color+"18", color: load.color,
              border: `1px solid ${load.color}40`, borderRadius: 6, padding: "3px 9px" }}>{load.label}</span>
            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>{myItems.length} tasks</div>
          </div>
          {compact && (
            <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>{isCollapsed ? "▶" : "▼"}</span>
          )}
        </div>

        {!isCollapsed && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* ── Schedule Overview Gantt ── */}
            {myItems.length > 0 && (
              <div style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ padding: "8px 14px 6px", fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.07em" }}>
                  SCHEDULE OVERVIEW <span style={{ fontWeight: 400, color: "#c4c9d4" }}>· drag bars to reschedule</span>
                </div>
                <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  <div style={{ minWidth: (ganttDays + 2) * GDAY_W + 420, position: "relative" }}>
                    {/* Header */}
                    <div style={{ display: "flex", background: "#f7f8fa", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <div style={{ width: 100, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.05)", padding: "5px 10px", fontSize: 9, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.07em" }}>CLIENT</div>
                      <div style={{ width: 150, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.05)", padding: "5px 10px", fontSize: 9, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.07em" }}>DELIVERABLE</div>
                      <div style={{ width: 150, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.05)", padding: "5px 10px", fontSize: 9, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.07em" }}>TASK</div>
                      <div style={{ flex: 1, position: "relative", height: 24 }}>
                        {/* PTO header bands */}
                        {pto.filter(p => p.personId === person.id).map(p => {
                          const ps = gOff(p.start), pe = gOff(p.end);
                          if (pe < 0 || ps > ganttDays+2) return null;
                          const l = Math.max(0,ps)*GDAY_W, r = Math.min(ganttDays+2,pe+1)*GDAY_W;
                          return <div key={p.id} title={`PTO${p.note?" · "+p.note:""}`} style={{ position:"absolute", left:l, top:0, bottom:0, width:r-l, background:"rgba(0,0,0,0.07)", display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}><span style={{ fontSize:7, fontWeight:700, color:"rgba(0,0,0,0.35)" }}>🌴</span></div>;
                        })}
                        {/* Week markers */}
                        {Array.from({ length: Math.ceil(ganttDays/7) }, (_,wi) => {
                          const d = new Date(gStart.getTime() + wi*7*86400000);
                          return <div key={wi} style={{ position:"absolute", left:wi*7*GDAY_W, height:"100%", display:"flex", alignItems:"center", paddingLeft:4, fontSize:8, color:"#9ca3af", fontWeight:600, borderLeft:"1px solid rgba(0,0,0,0.06)", whiteSpace:"nowrap" }}>{d.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>;
                        })}
                      </div>
                    </div>
                    {/* Rows */}
                    {myItems.map(item => {
                      const sOff = gOff(item.start), eOff = gOff(item.end);
                      const bw = Math.max((eOff-sOff)*GDAY_W+GDAY_W, 8);
                      const proj = projects.find(p => p.id === item.projectId);
                      const del  = proj?.deliverables.find(d => d.id === item.deliverableId);
                      return (
                        <div key={item.id} style={{ display:"flex", height:G_ROW, borderBottom:"1px solid rgba(0,0,0,0.04)", alignItems:"center" }}
                          onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.02)"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <div style={{ width:100, flexShrink:0, padding:"0 8px", borderRight:"1px solid rgba(0,0,0,0.04)", overflow:"hidden", display:"flex", alignItems:"center" }}>
                            <span style={{ fontSize:10, fontWeight:700, color:"#374151", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{proj?.client||"—"}</span>
                          </div>
                          <div style={{ width:150, flexShrink:0, padding:"0 8px", borderRight:"1px solid rgba(0,0,0,0.04)", overflow:"hidden", display:"flex", alignItems:"center" }}>
                            <span style={{ fontSize:10, fontWeight:600, color:proj?.color||"#374151", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{del?.title||item.title}</span>
                          </div>
                          <div onClick={() => onEditItem(item)} style={{ width:150, flexShrink:0, padding:"0 8px", borderRight:"1px solid rgba(0,0,0,0.04)", overflow:"hidden", display:"flex", alignItems:"center", cursor:"pointer" }}>
                            <span style={{ fontSize:10, fontWeight:600, color:"#374151", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{del ? item.title : "—"}</span>
                          </div>
                          <div style={{ flex:1, height:"100%", position:"relative", overflow:"visible" }}>
                            {/* Holiday shading */}
                            {holidays.map(h => { const ho=gOff(h.date); if(ho<0||ho>ganttDays+2) return null; return <div key={h.date} style={{ position:"absolute", left:ho*GDAY_W, top:0, bottom:0, width:GDAY_W, background:"rgba(251,146,60,0.1)", pointerEvents:"none" }} />; })}
                            {/* PTO shading */}
                            {pto.filter(p=>p.personId===person.id).map(p => {
                              const ps=gOff(p.start), pe=gOff(p.end); if(pe<0||ps>ganttDays+2) return null;
                              const l=Math.max(0,ps)*GDAY_W, r=Math.min(ganttDays+2,pe+1)*GDAY_W;
                              return <div key={p.id} style={{ position:"absolute", left:l, top:0, bottom:0, width:r-l, background:"repeating-linear-gradient(45deg,rgba(0,0,0,0.04) 0px,rgba(0,0,0,0.04) 4px,rgba(0,0,0,0.08) 4px,rgba(0,0,0,0.08) 8px)", borderLeft:"1px solid rgba(0,0,0,0.1)", borderRight:"1px solid rgba(0,0,0,0.1)", pointerEvents:"none", zIndex:1 }} />;
                            })}
                            {/* Week grid */}
                            {Array.from({length:Math.ceil(ganttDays/7)},(_,wi)=>(<div key={wi} style={{ position:"absolute", left:wi*7*GDAY_W, top:0, bottom:0, width:1, background:"rgba(0,0,0,0.04)" }} />))}
                            {/* Bar */}
                            <div onMouseDown={e=>startDrag(item,e)} onClick={() => onEditItem(item)}
                              style={{ position:"absolute", left:sOff*GDAY_W, top:"50%", transform:"translateY(-50%)", width:bw, height:16, borderRadius:4, cursor:"pointer", background:(proj?.color||"#6b7280")+"cc", border:`1.5px solid ${proj?.color||"#6b7280"}`, overflow:"hidden", userSelect:"none" }}>
                              <div style={{ position:"absolute", inset:0, width:`${item.progress||0}%`, background:"rgba(0,0,0,0.15)" }} />
                              <div style={{ position:"relative", padding:"0 4px", fontSize:8, fontWeight:600, color:"#fff", lineHeight:"16px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.title}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Task cards: In Progress + Not Started ── */}
            {!compact && (
              <div style={{ display:"flex", gap:12, padding:14, alignItems:"flex-start" }}>
                {["In Progress","Not Started"].map(s => {
                  const items = (byStatus[s]||[]);
                  const m = statusMeta[s]||statusMeta["Not Started"];
                  return (
                    <div key={s} style={{ flex:1, minWidth:0, background:"rgba(0,0,0,0.015)", border:"1px solid rgba(0,0,0,0.06)", borderRadius:8, overflow:"hidden" }}>
                      <div style={{ padding:"8px 12px", borderBottom:"1px solid rgba(0,0,0,0.05)", display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:m.color }} />
                        <span style={{ fontSize:10, fontWeight:700, color:m.color }}>{s}</span>
                        <span style={{ marginLeft:"auto", fontSize:10, fontWeight:700, color:m.color, background:m.bg, borderRadius:8, padding:"1px 7px" }}>{items.length}</span>
                      </div>
                      <div style={{ padding:"8px 10px", display:"flex", flexWrap:"wrap", gap:6 }}>
                        {items.map(item => (
                          <div key={item.id} onClick={() => onEditItem(item)} style={{ flex:"0 0 calc(50% - 3px)", minWidth:120, boxSizing:"border-box", background:"#fff", border:"1px solid rgba(0,0,0,0.07)", borderLeft:`3px solid ${item.projectColor}`, borderRadius:6, padding:"7px 9px", cursor:"pointer" }}
                            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 1px 6px rgba(0,0,0,0.08)"}
                            onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                            <div style={{ fontSize:11, fontWeight:700, color:"#1f2937", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</div>
                            <div style={{ fontSize:9, color:item.projectColor, fontWeight:600, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.projectName}</div>
                            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:4, flexWrap:"wrap" }}>
                              <StatusBadge status={item.status} small />
                              {item.effort && item.effort!=="M" && <span style={{ fontSize:9, color:"#6b7280", background:"rgba(0,0,0,0.05)", borderRadius:3, padding:"1px 4px" }}>{EFFORT_LABEL[item.effort]}</span>}
                              {item.end && <span style={{ fontSize:9, color:"#9ca3af", marginLeft:"auto" }}>Due {fmt(parseDate(item.end))}</span>}
                            </div>
                          </div>
                        ))}
                        {items.length===0 && <div style={{ width:"100%", padding:"10px 0", textAlign:"center", fontSize:10, color:"#9ca3af" }}>None</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Blocked — shown in both modes if any */}
            {(byStatus["Blocked"]||[]).length > 0 && (
              <div style={{ margin:"0 14px 14px", background:"rgba(248,113,113,0.04)", border:"1px solid rgba(248,113,113,0.2)", borderRadius:8, padding:"8px 12px" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#f87171", marginBottom:6 }}>⊘ Blocked · {(byStatus["Blocked"]||[]).length}</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {(byStatus["Blocked"]||[]).map(item => (
                    <div key={item.id} onClick={() => onEditItem(item)} style={{ fontSize:10, fontWeight:600, color:"#374151", background:"#fff", border:"1px solid rgba(248,113,113,0.2)", borderLeft:`3px solid ${item.projectColor}`, borderRadius:6, padding:"5px 9px", cursor:"pointer", whiteSpace:"nowrap" }}>{item.title}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── View mode toggle + person selector ────────────────────────────────────
  const visiblePeople = viewMode === "compare"
    ? (compared.length > 0 ? people.filter(p => compared.includes(p.id)) : people)
    : [people.find(p => p.id === selected)].filter(Boolean);

  return (
    <div style={{ display:"flex", gap:14, alignItems:"flex-start", flexWrap:"wrap" }}>

      {/* ── Sidebar ── */}
      <div style={{ width:200, flexShrink:0, display:"flex", flexDirection:"column", gap:6, minWidth:180 }}>

        {/* Mode toggle */}
        <div style={{ display:"flex", gap:4, marginBottom:4 }}>
          {[["single","Single"],["compare","Compare"]].map(([m,l]) => (
            <button key={m} onClick={() => setViewMode(m)} style={{
              flex:1, padding:"5px 0", fontSize:10, fontWeight:700, fontFamily:"inherit", cursor:"pointer",
              border:`1px solid ${viewMode===m ? BRAND_TEAL+"80" : "rgba(0,0,0,0.1)"}`,
              background: viewMode===m ? BRAND_TEAL_L : "#fff",
              color: viewMode===m ? BRAND_TEAL_D : "#6b7280", borderRadius:6,
            }}>{l}</button>
          ))}
        </div>

        {/* Compare mode: "Select All" helper */}
        {viewMode === "compare" && (
          <div style={{ display:"flex", gap:4, marginBottom:2 }}>
            <button onClick={() => setCompared(people.map(p=>p.id))} style={{ flex:1, fontSize:9, padding:"3px 0", background:"none", border:"1px solid rgba(0,0,0,0.1)", borderRadius:5, cursor:"pointer", color:"#6b7280", fontFamily:"inherit" }}>Select All</button>
            <button onClick={() => setCompared([])} style={{ flex:1, fontSize:9, padding:"3px 0", background:"none", border:"1px solid rgba(0,0,0,0.1)", borderRadius:5, cursor:"pointer", color:"#6b7280", fontFamily:"inherit" }}>Clear</button>
          </div>
        )}

        {/* Person list */}
        {people.map(p => {
          const items  = allActive.filter(t => (t.assignees||[]).includes(p.id));
          const active = items.filter(t => t.status==="In Progress").length;
          const load   = loadBadge(items);
          const isSel  = viewMode==="single" ? p.id===selected : compared.includes(p.id);
          return (
            <div key={p.id}
              onClick={() => viewMode==="single" ? setSelected(p.id) : toggleCompare(p.id)}
              style={{ display:"flex", alignItems:"center", gap:9, padding:"10px 12px", borderRadius:8, cursor:"pointer",
                background: isSel ? p.color+"14" : "#ffffff",
                border:`1px solid ${isSel ? p.color+"50" : "rgba(0,0,0,0.07)"}`,
                transition:"all 0.12s" }}>
              <Avatar person={p} size={30} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#1f2937", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                <div style={{ fontSize:9, color:"#6b7280", marginTop:1 }}>{items.length} · {active} active</div>
              </div>
              <div style={{ width:6, height:6, borderRadius:"50%", background:load.color, flexShrink:0 }} title={load.label} />
              {viewMode==="compare" && (
                <div style={{ width:14, height:14, borderRadius:3, border:`1.5px solid ${isSel ? p.color : "rgba(0,0,0,0.2)"}`, background:isSel ? p.color : "transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {isSel && <span style={{ fontSize:8, color:"#fff", fontWeight:900 }}>✓</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Main panels ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:14, minWidth:0 }}>
        {viewMode==="compare" && compared.length===0 && (
          <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.07)", borderRadius:10, padding:"32px 20px", textAlign:"center", color:"#9ca3af", fontSize:12 }}>
            Select team members from the sidebar to compare their schedules side by side.
          </div>
        )}
        {visiblePeople.map(person => (
          <PersonPanel key={person.id} person={person} compact={viewMode==="compare"} />
        ))}
      </div>
    </div>
  );
}


// --- WORKLOAD VIEW ────────────────────────────────────────────────────────────
function WorkloadView({ projects, people, onEditItem, pto = [], holidays = [] }) {
  const [filterPerson,  setFilterPerson]  = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterStatus,  setFilterStatus]  = useState("active"); // all | active | done
  const [hovered, setHovered] = useState(null); // { weekKey, personId }
  const [drillWeek, setDrillWeek] = useState(null); // weekKey string

  // ── helpers ────────────────────────────────────────────────────────────────
  const isoWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // back to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const weekKey = (date) => {
    const ws = isoWeekStart(date);
    return ws.toISOString().slice(0, 10);
  };
  const weekLabel = (key) => {
    const d = new Date(key + "T00:00:00");
    return `W/O ${d.getMonth() + 1}/${d.getDate()}`;
  };
  const holidaySet = new Set((holidays||[]).map(h => h.date));

  // ── flatten all tasks ──────────────────────────────────────────────────────
  // Deliverables with subtasks are structural — only include leaf work items:
  // - subtasks always included
  // - deliverables only if they have NO subtasks (they ARE the work item)
  const allTasks = projects.flatMap(proj =>
    proj.deliverables.flatMap(del => {
      const subs = del.subtasks.map(s => ({
        ...s, projId: proj.id, projName: proj.name, projColor: proj.color,
        delId: del.id, delTitle: del.title, isSubtask: true,
      }));
      if (subs.length > 0) return subs; // has subtasks → use subtasks only
      // No subtasks → deliverable itself is the work item
      return [{ ...del, projId: proj.id, projName: proj.name, projColor: proj.color,
        delId: del.id, delTitle: del.title, isSubtask: false }];
    })
  );

  // ── apply filters ──────────────────────────────────────────────────────────
  const filteredTasks = allTasks.filter(t => {
    if (!t.start || !t.end) return false;
    if (filterPerson  !== "all" && !(t.assignees || []).includes(filterPerson))  return false;
    if (filterProject !== "all" && t.projId !== filterProject) return false;
    if (filterStatus === "active" && t.status === "Done") return false;
    if (filterStatus === "done"   && t.status !== "Done") return false;
    return true;
  });

  // ── aggregate into weeks (hours-based) ───────────────────────────────────
  // Tasks are split evenly across the weeks they span
  const weekMap = {}; // weekKey → { personId → { hrs, tasks[] } }
  filteredTasks.forEach(task => {
    const assignees = task.assignees?.length ? task.assignees : ["_unassigned"];
    const start = new Date(task.start + "T00:00:00");
    const end   = new Date(task.end   + "T00:00:00");
    const weeks = [];
    let cur = new Date(isoWeekStart(start));
    while (cur <= end) { weeks.push(weekKey(cur)); cur = new Date(cur.getTime() + 7 * 86400000); }
    const hrsTotal = effortHours(task.effort);
    const hrsPerWeek = hrsTotal / Math.max(1, weeks.length);
    weeks.forEach(wk => {
      if (!weekMap[wk]) weekMap[wk] = {};
      assignees.forEach(pid => {
        if (!weekMap[wk][pid]) weekMap[wk][pid] = { hrs: 0, tasks: [] };
        weekMap[wk][pid].hrs  += hrsPerWeek;
        weekMap[wk][pid].tasks.push(task);
      });
    });
  });

  // ── sort weeks chronologically ─────────────────────────────────────────────
  const sortedWeeks = Object.keys(weekMap).sort();
  const allPersonIds = [...new Set(filteredTasks.flatMap(t => t.assignees?.length ? t.assignees : ["_unassigned"]))];
  const visPersonIds = filterPerson === "all" ? allPersonIds : [filterPerson];

  // ── chart dimensions ──────────────────────────────────────────────────────
  const BAR_W  = 42;
  const GAP    = 10;
  const MAX_H  = 200;
  const LABEL_H = 28;
  const LABEL_W = 48;
  const chartW = sortedWeeks.length * (BAR_W + GAP) + LABEL_W;

  // Max total hours in any week (for Y scale)
  const maxHrs = Math.max(1, WEEKLY_HOURS, ...sortedWeeks.map(wk =>
    visPersonIds.reduce((s, pid) => s + (weekMap[wk]?.[pid]?.hrs || 0), 0)
  ));

  // ── drill tasks ───────────────────────────────────────────────────────────
  const drillTasks = drillWeek
    ? filteredTasks.filter(t => {
        if (!t.start) return false;
        const start = new Date(t.start + "T00:00:00");
        const end   = new Date(t.end   + "T00:00:00");
        let cur = new Date(isoWeekStart(start));
        while (cur <= end) {
          if (weekKey(cur) === drillWeek) return true;
          cur = new Date(cur.getTime() + 7 * 86400000);
        }
        return false;
      })
    : [];

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: fs(15), fontWeight: 800, color: "#1f2937" }}>Team Workload</div>
            <div style={{ fontSize: fs(11), color: "#6b7280", marginTop: 2 }}>Relative workload volume by week and team member</div>
          </div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)}
              style={{ fontSize: 11, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "5px 10px", background: "#fff", fontFamily: "inherit" }}>
              <option value="all">All People</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
              style={{ fontSize: 11, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "5px 10px", background: "#fff", fontFamily: "inherit" }}>
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ fontSize: 11, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "5px 10px", background: "#fff", fontFamily: "inherit" }}>
              <option value="active">Active tasks</option>
              <option value="all">All tasks</option>
              <option value="done">Done only</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Stacked bar chart ── */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "20px 20px 12px", overflowX: "auto" }}>
        {sortedWeeks.length === 0 ? (
          <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, padding: 40 }}>No tasks match the current filters.</div>
        ) : (
          <>
            {/* Legend */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              {visPersonIds.map(pid => {
                const person = people.find(p => p.id === pid);
                if (!person && pid !== "_unassigned") return null;
                return (
                  <div key={pid} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#374151" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: person?.color || "#9ca3af" }} />
                    {person?.name || "Unassigned"}
                  </div>
                );
              })}
              <div style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: 10, color: "#9ca3af", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#34d399", display: "inline-block" }} />Light</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#fbbf24", display: "inline-block" }} />Moderate</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#fb923c", display: "inline-block" }} />Busy</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#f87171", display: "inline-block" }} />Heavy</span>
              </div>
            </div>

            {/* SVG Chart */}
            <svg width={chartW} height={MAX_H + LABEL_H + 24} style={{ display: "block", overflow: "visible" }}>
              {/* Y-axis grid lines */}
              {[0.25, 0.5, 0.75, 1].map(pct => {
                const y = MAX_H - pct * MAX_H;
                const pts = Math.round(pct * maxHrs);
                return (
                  <g key={pct}>
                    <line x1={LABEL_W} y1={y} x2={chartW} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
                    {/* Y-axis: no numeric labels shown to users */}
                  </g>
                );
              })}

              {/* Bars */}
              {sortedWeeks.map((wk, wi) => {
                const x = LABEL_W + wi * (BAR_W + GAP);
                const totalHrs = visPersonIds.reduce((s, pid) => s + (weekMap[wk]?.[pid]?.hrs || 0), 0);
                const load = classifyLoad(totalHrs, WEEKLY_HOURS * visPersonIds.length);
                const capColor = load.color;
                const isDrill = drillWeek === wk;

                let stackY = MAX_H;
                return (
                  <g key={wk} style={{ cursor: "pointer" }}
                    onClick={() => setDrillWeek(isDrill ? null : wk)}
                    onMouseEnter={() => setHovered(wk)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* capacity line at WEEKLY_HOURS mark */}
                    {visPersonIds.length === 1 && (
                      <line x1={x} y1={MAX_H - (WEEKLY_HOURS / maxHrs) * MAX_H}
                            x2={x + BAR_W} y2={MAX_H - (WEEKLY_HOURS / maxHrs) * MAX_H}
                            stroke="rgba(0,0,0,0.2)" strokeWidth={1} strokeDasharray="3,2" />
                    )}
                    <circle cx={x + BAR_W / 2} cy={MAX_H + 6} r={3} fill={capColor} />

                    {/* stacked segments */}
                    {visPersonIds.map(pid => {
                      const hrs = weekMap[wk]?.[pid]?.hrs || 0;
                      if (!hrs) return null;
                      const segH = Math.max(2, (hrs / maxHrs) * MAX_H);
                      stackY -= segH;
                      const person = people.find(p => p.id === pid);
                      const fill = person?.color || "#9ca3af";
                      const isHov = hovered === wk;
                      return (
                        <rect key={pid}
                          x={x} y={stackY} width={BAR_W} height={segH}
                          fill={fill}
                          opacity={isHov ? 1 : 0.82}
                          rx={pid === visPersonIds[visPersonIds.length - 1] ? 3 : 0}
                          style={{ transition: "opacity 0.1s" }}
                        />
                      );
                    })}

                    {/* total label on hover */}
                    {hovered === wk && (() => {
                      const wkTasks = filteredTasks.filter(t => {
                        if (!t.start) return false;
                        let cur = new Date(isoWeekStart(new Date(t.start + "T00:00:00")));
                        const end = new Date((t.end || t.start) + "T00:00:00");
                        while (cur <= end) { if (weekKey(cur) === wk) return true; cur = new Date(cur.getTime() + 7*86400000); }
                        return false;
                      });
                      const s = wkTasks.filter(t=>(t.effort||"M")==="S").length;
                      const m = wkTasks.filter(t=>(t.effort||"M")==="M").length;
                      const l = wkTasks.filter(t=>(t.effort||"M")==="L").length;
                      const wkHrs = Math.round(visPersonIds.reduce((acc,pid)=>acc+(weekMap[wk]?.[pid]?.hrs||0),0));
                      const wkAvail = filterPerson !== "all" ? availableHours(filterPerson, wk, pto, holidaySet) : WEEKLY_HOURS * visPersonIds.length;
                      const overloaded = wkHrs > wkAvail;
                      // Build per-person breakdown for tooltip
                      const personBreakdown = visPersonIds.map(pid => {
                        const person = people.find(p => p.id === pid);
                        const pTasks = wkTasks.filter(t => (t.assignees || []).includes(pid));
                        return person && pTasks.length ? { name: person.name.split(" ")[0], color: person.color, count: pTasks.length } : null;
                      }).filter(Boolean);
                      const ttH = 28 + personBreakdown.length * 14 + 14;
                      // Flip tooltip below bar if bar top is within ttH+8px of chart top
                      const showBelow = stackY < ttH + 8;
                      const ttY = showBelow ? MAX_H + 16 : stackY - ttH - 4;
                      const labelY = showBelow ? MAX_H + 16 + 14 : stackY - ttH + 14;
                      return (
                        <g>
                          <rect x={x - 14} y={ttY} width={BAR_W + 28} height={ttH} rx={5} fill="#1f2937" opacity={0.95} />
                          <text x={x + BAR_W/2} y={labelY} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff">{wkTasks.length} task{wkTasks.length !== 1 ? "s" : ""}{overloaded ? " ⚠" : ""}</text>
                          {personBreakdown.map((pb, pi) => (
                            <g key={pb.name}>
                              <rect x={x - 6} y={labelY + 8 + pi * 14} width={7} height={7} rx={1} fill={pb.color} />
                              <text x={x + 6} y={labelY + 15 + pi * 14} fontSize={9} fill="#d1d5db">{pb.name}: {pb.count}</text>
                            </g>
                          ))}
                          {!showBelow && <text x={x + BAR_W/2} y={stackY - 9} textAnchor="middle" fontSize={8} fill="#6b7280">click to drill in</text>}
                        </g>
                      );
                    })()}

                    {/* selected outline */}
                    {isDrill && (
                      <rect x={x - 1} y={0} width={BAR_W + 2} height={MAX_H} fill="none" stroke={BRAND_TEAL} strokeWidth={2} rx={3} />
                    )}

                    {/* week label */}
                    <text x={x + BAR_W / 2} y={MAX_H + LABEL_H} textAnchor="middle" fontSize={9} fill="#6b7280" fontWeight={600}>
                      {weekLabel(wk)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </>
        )}
      </div>

      {/* ── Drill-down task list ── */}
      {drillWeek && (
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>Tasks in week of {weekLabel(drillWeek)}</span>
            <button onClick={() => setDrillWeek(null)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {drillTasks.length === 0
              ? <div style={{ padding: 20, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No tasks this week.</div>
              : drillTasks.map(t => {
                  const effortColors = { S: "#34d399", M: "#fbbf24", L: "#f87171" };
                  return (
                    <div key={t.id} onClick={() => onEditItem && onEditItem({ ...t, projectId: t.projId, projectName: t.projName, projectColor: t.projColor, deliverableId: t.isSubtask ? t.delId : null, delTitle: t.isSubtask ? t.delTitle : null })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(0,0,0,0.04)", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.025)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ width: 3, height: 32, background: t.projColor, borderRadius: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: t.status === "Done" ? "#9ca3af" : "#1f2937", textDecoration: t.status === "Done" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>{t.projName}{t.isSubtask ? ` · ${t.delTitle}` : ""}</div>
                      </div>
                      <div style={{ fontSize: 10, color: effortColors[t.effort || "M"], fontWeight: 700, background: effortColors[t.effort || "M"] + "18", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
                        {EFFORT_LABEL[t.effort || "M"]}
                      </div>
                      {/* Assignee color dots */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        {(t.assignees || []).map(id => {
                          const p = people.find(x => x.id === id);
                          return p ? (
                            <div key={id} title={p.name} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 9, color: "#6b7280" }}>{p.name.split(" ")[0]}</span>
                            </div>
                          ) : null;
                        })}
                        {!(t.assignees || []).length && <span style={{ fontSize: 9, color: "#9ca3af" }}>Unassigned</span>}
                      </div>
                    </div>
                  );
                })
            }
          </div>
          <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 16, fontSize: 11 }}>
            <span style={{ color: "#6b7280" }}>{drillTasks.length} tasks</span>
            <span style={{ color: "#34d399" }}>Small: {drillTasks.filter(t => (t.effort || "M") === "S").length}</span>
            <span style={{ color: "#fbbf24" }}>Medium: {drillTasks.filter(t => (t.effort || "M") === "M").length}</span>
            <span style={{ color: "#f87171" }}>Large: {drillTasks.filter(t => (t.effort || "M") === "L").length}</span>
          </div>
        </div>
      )}

      {/* ── Per-person summary cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {people.map(person => {
          const myTasks = filteredTasks.filter(t => (t.assignees || []).includes(person.id));
          const totalPts = myTasks.reduce((s, t) => s + effortHours(t.effort), 0);
          const bySize = { S: myTasks.filter(t => (t.effort || "M") === "S").length, M: myTasks.filter(t => (t.effort || "M") === "M").length, L: myTasks.filter(t => (t.effort || "M") === "L").length };
          return (
            <div key={person.id} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: person.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {person.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div style={{ fontSize: fs(12), fontWeight: 700, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.name}</div>
                <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: person.color }}>{myTasks.length} tasks</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["S","M","L"].map(sz => (
                  <div key={sz} style={{ flex: 1, textAlign: "center", background: "rgba(0,0,0,0.03)", borderRadius: 6, padding: "4px 0" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: { S: "#34d399", M: "#fbbf24", L: "#f87171" }[sz] }}>{bySize[sz]}</div>
                    <div style={{ fontSize: 9, color: "#9ca3af" }}>{sz}</div>
                  </div>
                ))}
              </div>
              {(() => {
                const cl = classifyLoad(totalPts, WEEKLY_HOURS);
                return (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (totalPts / (WEEKLY_HOURS * 2)) * 100)}%`, background: cl.color, borderRadius: 2, transition: "width 0.3s" }} />
                    </div>
                    {totalPts > WEEKLY_HOURS && (
                      <div style={{ fontSize: 9, color: "#f87171", fontWeight: 700, marginTop: 2 }}>Over capacity</div>
                    )}
                  </div>
                );
              })()}
              {/* Overloaded weeks callout */}
              {(() => {
                const overloadedWeeks = sortedWeeks.filter(wk => {
                  const hrs = weekMap[wk]?.[person.id]?.hrs || 0;
                  const avail = availableHours(person.id, wk, pto, holidaySet);
                  return hrs > avail;
                });
                return overloadedWeeks.length > 0 ? (
                  <div style={{ fontSize: 9, color: "#f87171", fontWeight: 700, marginTop: 3 }}>
                    ⚠ Over capacity: {overloadedWeeks.map(wk => weekLabel(wk)).join(", ")}
                  </div>
                ) : (
                  <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 3 }}>{myTasks.length} tasks assigned</div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MY HUB VIEW ─────────────────────────────────────────────────────────────
// Personal operational command center. Insert before StatusView in App.jsx.

function MyHubView({ projects, people, holidays, pto = [], currentUserId, onSetCurrentUser, onEditItem, onMarkDone, savePto, deletePto }) {
  const TODAY = new Date(); TODAY.setHours(0,0,0,0);

  // Week bounds (Mon–Sun)
  const weekStart = new Date(TODAY);
  const day = weekStart.getDay(); weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const weekStartStr = weekStart.toISOString().slice(0,10);
  const weekEndStr   = weekEnd.toISOString().slice(0,10);

  const todayStr = TODAY.toISOString().slice(0,10);

  const EFFORT_VAL = { S: 1, M: 2, L: 3 };
  const efv = (e) => EFFORT_VAL[e] || 2;

  const [showPtoForm, setShowPtoForm] = useState(false);
  const [ptoForm, setPtoForm] = useState({ start: todayStr, end: todayStr, note: "" });
  const hubHolidaySet = new Set((holidays||[]).map(h => h.date));

  // ── Resolve current user ──────────────────────────────────────────────────
  const me = people.find(p => p.id === currentUserId) || people[0];
  const meId = me?.id || "";

  // ── Flatten executable tasks assigned to me ──────────────────────────────
  // Subtasks always included. Leaf deliverables (no subtasks) also included if assigned.
  const allMyTasks = projects.flatMap(proj =>
    proj.deliverables.flatMap(del => {
      if (del.subtasks && del.subtasks.length > 0) {
        // Has subtasks — only include assigned subtasks
        return del.subtasks
          .filter(s => (s.assignees || []).includes(meId))
          .map(s => ({
            ...s, projId: proj.id, projName: proj.name, projColor: proj.color,
            delId: del.id, delTitle: del.title, isSubtask: true, deliverableId: del.id,
          }));
      } else {
        // Leaf deliverable — include if assigned to me
        if (!(del.assignees || []).includes(meId)) return [];
        return [{ ...del, projId: proj.id, projName: proj.name, projColor: proj.color,
          delId: del.id, delTitle: del.title, isSubtask: false, deliverableId: null }];
      }
    })
  );

  // ── All tasks across all projects (for dependency analysis) ───────────────
  const allTasksFlat = projects.flatMap(proj =>
    proj.deliverables.flatMap(del => [
      { ...del, projId: proj.id },
      ...del.subtasks.map(s => ({ ...s, projId: proj.id, delId: del.id }))
    ])
  );
  const taskById = Object.fromEntries(allTasksFlat.map(t => [t.id, t]));

  // ── Dependency helpers ────────────────────────────────────────────────────
  const isDependencyClear = (task) => {
    if (!task.dependencies?.length) return true;
    return task.dependencies.every(depId => taskById[depId]?.status === "Done");
  };
  const blockedBy = (task) =>
    (task.dependencies || []).map(id => taskById[id]).filter(d => d && d.status !== "Done");
  // "Currently blocking" = I own an upstream task that is due TODAY or OVERDUE and not Done
  const tasksBlockedByMe = allTasksFlat.filter(t =>
    t.status !== "Done" && t.isSubtask !== false && (t.dependencies || []).some(depId => {
      const dep = taskById[depId];
      return dep && dep.status !== "Done"
        && (dep.assignees || []).includes(meId)
        && dep.end && dep.end <= todayStr; // only if due today or overdue
    })
  );
  // "Upcoming dependency risk" = I own an upstream task due in the future with downstream deps
  const upcomingDepRisk = allTasksFlat.filter(t =>
    t.status !== "Done" && (t.dependencies || []).some(depId => {
      const dep = taskById[depId];
      return dep && dep.status !== "Done"
        && (dep.assignees || []).includes(meId)
        && dep.end && dep.end > todayStr; // future only
    })
  );
  const recentlyUnblocked = allMyTasks.filter(t =>
    t.status !== "Done" && isDependencyClear(t) &&
    (t.dependencies || []).length > 0
  );

  // ── Date helpers ──────────────────────────────────────────────────────────
  const daysDiff = (dateStr) => {
    if (!dateStr) return 999;
    return Math.ceil((new Date(dateStr + "T00:00:00") - TODAY) / 86400000);
  };
  const isOverdue    = (t) => t.end && daysDiff(t.end) < 0  && t.status !== "Done";
  const isDueSoon    = (t) => t.end && daysDiff(t.end) >= 0 && daysDiff(t.end) <= 7 && t.status !== "Done";
  const isDueThisWk  = (t) => t.end && t.end >= weekStartStr && t.end <= weekEndStr;
  const isActive     = (t) => t.status !== "Done" && t.status !== "Blocked";

  // ── Smart priority score (hidden from user) ───────────────────────────────
  const score = (task) => {
    let s = 0;
    const d = daysDiff(task.end);
    if (d < 0)  s += 100;              // overdue
    if (d <= 2) s += 50;               // due in 2 days
    if (d <= 7) s += 30;               // due this week
    if (task.status === "In Progress") s += 20;
    if (task.priority === "Critical")  s += 25;
    if (task.priority === "High")      s += 15;
    if (efv(task.effort) === 3)        s += 10;  // large = high value
    if (isDependencyClear(task))       s += 10;  // unblocked = actionable
    if (recentlyUnblocked.find(t => t.id === task.id)) s += 15; // just became ready
    return s;
  };

  // ── Section data ──────────────────────────────────────────────────────────
  const activeTasks   = allMyTasks.filter(t => t.status !== "Done");
  const overdueTasks  = allMyTasks.filter(isOverdue).sort((a,b) => daysDiff(a.end) - daysDiff(b.end));
  const dueSoonTasks  = allMyTasks.filter(t => !isOverdue(t) && isDueSoon(t)).sort((a,b) => daysDiff(a.end) - daysDiff(b.end));
  const blockedTasks  = allMyTasks.filter(t => t.status === "Blocked" || (t.status !== "Done" && blockedBy(t).length > 0));
  const readyTasks    = allMyTasks.filter(t => t.status !== "Done" && t.status !== "Blocked" && isDependencyClear(t));
  const recommended   = [...readyTasks].sort((a,b) => score(b) - score(a)).slice(0, 8);
  const waitingTasks  = allMyTasks.filter(t =>
    t.status !== "Done" && (t.dependencies || []).some(depId => {
      const dep = taskById[depId];
      return dep && dep.status !== "Done" && !(dep.assignees || []).includes(meId);
    })
  );
  const weekTasks     = allMyTasks.filter(t => t.status !== "Done" && isDueThisWk(t));
  const highEffort    = allMyTasks.filter(t => t.status !== "Done" && efv(t.effort) >= 3 && isDueThisWk(t));

  // ── Weekly workload (hours-based) ─────────────────────────────────────────
  const weekHours = weekTasks.reduce((s,t) => s + effortHours(t.effort), 0);
  const weekAvail = availableHours(meId, weekStartStr, pto, hubHolidaySet);
  const weekLoad  = classifyLoad(weekHours, weekAvail);
  const loadLabel = weekLoad.label;
  const loadColor = weekLoad.color;
  const weekPoints = weekHours; // alias for bar width calc

  // ── PTO this week for me ──────────────────────────────────────────────────
  const myPto  = pto.filter(p => p.personId === meId && p.end >= todayStr);
  const onPtoNow = myPto.some(p => todayStr >= p.start && todayStr <= p.end);
  const ptoThisWk = myPto.filter(p => p.start <= weekEndStr && p.end >= weekStartStr);

  // ── Render helpers ────────────────────────────────────────────────────────
  const TaskCard = ({ task, badge, badgeColor }) => {
    const d = daysDiff(task.end);
    const overdue = isOverdue(task);
    const cleared = isDependencyClear(task);
    const blocked = blockedBy(task);
    return (
      <div onClick={() => onEditItem({ ...task, projectId: task.projId, projectName: task.projName, projectColor: task.projColor, deliverableId: task.isSubtask ? (task.deliverableId || task.delId) : null, delTitle: task.isSubtask ? task.delTitle : null })}
        style={{ background: "#fff", border: `1px solid ${overdue ? "rgba(248,113,113,0.3)" : "rgba(0,0,0,0.07)"}`, borderLeft: `3px solid ${task.projColor}`, borderRadius: 8, padding: "11px 14px", cursor: "pointer", transition: "box-shadow 0.12s" }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"}
        onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1f2937", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
            <div style={{ fontSize: 10, color: task.projColor, fontWeight: 600, marginBottom: 5 }}>{task.projName}{task.isSubtask ? ` · ${task.delTitle}` : ""}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
              {badge && <span style={{ fontSize: 9, fontWeight: 700, background: badgeColor + "18", color: badgeColor, borderRadius: 4, padding: "2px 6px" }}>{badge}</span>}
              <StatusBadge status={task.status} small />
              {task.effort !== "M" && <span style={{ fontSize: 9, color: "#6b7280", background: "rgba(0,0,0,0.05)", borderRadius: 3, padding: "1px 5px" }}>{EFFORT_LABEL[task.effort]}</span>}
              {!cleared && blocked.length > 0 && (
                <span style={{ fontSize: 9, color: "#f87171", background: "rgba(248,113,113,0.1)", borderRadius: 4, padding: "2px 6px" }}>
                  Blocked by {blocked.map(b => b.title).join(", ").slice(0,40)}
                </span>
              )}
              {task.end && (
                <span style={{ fontSize: 9, color: overdue ? "#f87171" : d <= 2 ? "#fb923c" : "#9ca3af", marginLeft: "auto", fontWeight: overdue ? 700 : 400 }}>
                  {overdue ? `${Math.abs(d)}d overdue` : d === 0 ? "Due today" : d === 1 ? "Due tomorrow" : `Due in ${d}d`}
                </span>
              )}
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); onMarkDone(task.projId, task.isSubtask ? task.delId : task.id, task.isSubtask ? task.id : null); }}
            style={{ flexShrink: 0, width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.15)", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}
            title="Mark done"
          >✓</button>
        </div>
      </div>
    );
  };

  const Section = ({ title, icon, count, color = "#6b7280", children, empty, collapsed: initCollapsed = false }) => {
    const [open, setOpen] = useState(!initCollapsed);
    if (!count) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <button onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", padding: "6px 0", textAlign: "left", fontFamily: "inherit" }}>
          <span style={{ fontSize: 11, color: open ? "#1f2937" : "#6b7280", fontWeight: 700 }}>{icon} {title}</span>
          <span style={{ fontSize: 10, background: color + "18", color, borderRadius: 10, padding: "1px 7px", fontWeight: 700 }}>{count}</span>
          <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: "auto" }}>{open ? "▲" : "▼"}</span>
        </button>
        {open && <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>}
      </div>
    );
  };

  if (!me) return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 14, color: "#6b7280" }}>No team members yet. Add people in ⚙ Settings → Team Members.</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Top bar: user selector ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: me.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
          {me.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1f2937" }}>{me.name}'s Hub</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>Your personal work command center</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <select value={meId} onChange={e => onSetCurrentUser(e.target.value)}
            style={{ fontSize: 11, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, padding: "5px 10px", background: "#fff", fontFamily: "inherit" }}>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
        {[
          { label: "Active Tasks", value: activeTasks.length, color: BRAND_TEAL, icon: "◉" },
          { label: "Due This Week", value: weekTasks.length, color: weekTasks.length > 5 ? "#fb923c" : "#34d399", icon: "◷" },
          { label: "Overdue", value: overdueTasks.length, color: overdueTasks.length > 0 ? "#f87171" : "#9ca3af", icon: "⚠" },
          { label: "Blocked", value: blockedTasks.length, color: blockedTasks.length > 0 ? "#f87171" : "#9ca3af", icon: "⊘" },
          { label: "Blocking Downstream", value: tasksBlockedByMe.length, color: tasksBlockedByMe.length > 0 ? "#ef4444" : "#9ca3af", icon: "◎" },
        ].map(card => (
          <div key={card.label} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 20, color: card.color, fontWeight: 900, lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4, fontWeight: 600 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* ── This week: workload + PTO ── */}
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1f2937", marginBottom: 6 }}>This week's workload</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 8, background: "rgba(0,0,0,0.06)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, (weekHours / Math.max(weekAvail, 8)) * 100)}%`, background: loadColor, borderRadius: 4, transition: "width 0.3s" }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: loadColor, minWidth: 55 }}>{loadLabel}</span>
            </div>
            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
              {weekTasks.length} task{weekTasks.length !== 1 ? "s" : ""} · {highEffort.length > 0 ? `${highEffort.length} large` : "no large tasks"}
            </div>
          </div>

          {/* PTO strip */}
          <div style={{ borderLeft: "1px solid rgba(0,0,0,0.07)", paddingLeft: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1f2937", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              🌴 Time Off
              <button onClick={() => setShowPtoForm(f => !f)} style={{ fontSize: 9, background: BRAND_TEAL_L, border: `1px solid ${BRAND_TEAL}50`, color: BRAND_TEAL_D, borderRadius: 4, padding: "2px 7px", cursor: "pointer", fontFamily: "inherit" }}>+ Add</button>
            </div>
            {myPto.length === 0 ? (
              <div style={{ fontSize: 10, color: "#9ca3af" }}>No upcoming PTO</div>
            ) : myPto.slice(0,3).map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#374151" }}>{fmt(parseDate(p.start))} – {fmt(parseDate(p.end))}</span>
                {p.note && <span style={{ fontSize: 9, color: "#9ca3af" }}>{p.note}</span>}
                <button onClick={() => deletePto(p.id)} style={{ fontSize: 9, background: "none", border: "none", color: "#d1d5db", cursor: "pointer", padding: "0 2px" }}>×</button>
              </div>
            ))}
            {showPtoForm && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, background: "rgba(0,0,0,0.02)", borderRadius: 6, padding: 10 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="date" value={ptoForm.start} onChange={e => setPtoForm(f => ({...f, start: e.target.value}))}
                    style={{ fontSize: 10, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 4, padding: "3px 6px", fontFamily: "inherit" }} />
                  <span style={{ fontSize: 10, color: "#9ca3af", alignSelf: "center" }}>–</span>
                  <input type="date" value={ptoForm.end} onChange={e => setPtoForm(f => ({...f, end: e.target.value}))}
                    style={{ fontSize: 10, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 4, padding: "3px 6px", fontFamily: "inherit" }} />
                </div>
                <input value={ptoForm.note} onChange={e => setPtoForm(f => ({...f, note: e.target.value}))}
                  placeholder="Optional note (Vacation, Conference…)"
                  style={{ fontSize: 10, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 4, padding: "3px 8px", fontFamily: "inherit" }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { savePto({ ...ptoForm, personId: meId, id: "pto_" + Date.now() }); setShowPtoForm(false); setPtoForm({ start: todayStr, end: todayStr, note: "" }); }}
                    style={{ flex: 1, background: BRAND_TEAL, border: "none", borderRadius: 4, color: BRAND_NAVY, fontSize: 10, fontWeight: 700, padding: "5px 0", cursor: "pointer", fontFamily: "inherit" }}>Save</button>
                  <button onClick={() => setShowPtoForm(false)}
                    style={{ flex: 1, background: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 4, color: "#6b7280", fontSize: 10, padding: "5px 0", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Dependency intelligence ── */}
      {(recentlyUnblocked.length > 0 || tasksBlockedByMe.length > 0 || waitingTasks.length > 0) && (
        <div style={{ background: "rgba(80,192,192,0.06)", border: `1px solid ${BRAND_TEAL}30`, borderRadius: 10, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: BRAND_TEAL_D, marginBottom: 2 }}>Dependency Updates</div>
          {recentlyUnblocked.length > 0 && (
            <div style={{ fontSize: 11, color: "#374151" }}>
              ✅ <strong>{recentlyUnblocked.length} task{recentlyUnblocked.length !== 1 ? "s" : ""}</strong> just became ready — dependencies completed
            </div>
          )}
          {tasksBlockedByMe.length > 0 && (
            <div style={{ fontSize: 11, color: "#374151" }}>
              🔴 <strong>{tasksBlockedByMe.length} task{tasksBlockedByMe.length !== 1 ? "s" : ""} you own {tasksBlockedByMe.length !== 1 ? "are" : "is"} blocking downstream work</strong> — due today or overdue
            </div>
          )}
          {upcomingDepRisk.length > 0 && (
            <div style={{ fontSize: 11, color: "#374151" }}>
              ⏰ <strong>{upcomingDepRisk.length} upcoming dependency risk{upcomingDepRisk.length !== 1 ? "s" : ""}</strong> — others are waiting on your future tasks
            </div>
          )}
          {waitingTasks.length > 0 && (() => {
            const waitingOn = [...new Set(waitingTasks.flatMap(t =>
              (t.dependencies || []).map(depId => {
                const dep = taskById[depId];
                if (!dep || dep.status === "Done") return null;
                return (dep.assignees || []).filter(a => a !== meId).map(a => people.find(p => p.id === a)?.name).filter(Boolean);
              }).flat().filter(Boolean)
            ))].slice(0,3);
            return (
              <div style={{ fontSize: 11, color: "#374151" }}>
                ⏳ Waiting on {waitingOn.length > 0 ? waitingOn.join(", ") : "others"} for {waitingTasks.length} task{waitingTasks.length !== 1 ? "s" : ""}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Sections ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        <Section title="Recommended Next" icon="⚡" count={recommended.length} color={BRAND_TEAL}>
          {recommended.map(t => <TaskCard key={t.id} task={t} />)}
        </Section>

        <Section title="Overdue" icon="⚠" count={overdueTasks.length} color="#f87171">
          {overdueTasks.map(t => <TaskCard key={t.id} task={t} badge="Overdue" badgeColor="#f87171" />)}
        </Section>

        <Section title="Due Soon" icon="◷" count={dueSoonTasks.length} color="#fb923c">
          {dueSoonTasks.map(t => <TaskCard key={t.id} task={t} />)}
        </Section>

        <Section title="Blocked" icon="⊘" count={blockedTasks.length} color="#f87171">
          {blockedTasks.map(t => {
            const blockers = blockedBy(t);
            return <TaskCard key={t.id} task={t} badge={blockers.length ? `Blocked · ${blockers.length}` : "Blocked"} badgeColor="#f87171" />;
          })}
        </Section>

        <Section title="Currently Blocking Downstream Work" icon="🔴" count={tasksBlockedByMe.length} color="#ef4444" collapsed={true}>
          {tasksBlockedByMe.map(t => {
            const blockingCount = allTasksFlat.filter(dt =>
              dt.status !== "Done" && (dt.dependencies || []).some(depId => taskById[depId]?.id === t.id)
            ).length;
            return <TaskCard key={t.id} task={t} badge={`Needs attention · blocking ${blockingCount}`} badgeColor="#ef4444" />;
          })}
        </Section>

        {upcomingDepRisk.length > 0 && (
          <Section title="Upcoming Dependency Risk" icon="⏰" count={upcomingDepRisk.length} color="#fb923c" collapsed={true}>
            {upcomingDepRisk.map(t => <TaskCard key={t.id} task={t} badge="Future dep risk" badgeColor="#fb923c" />)}
          </Section>
        )}

        <Section title="Waiting on Others" icon="⏳" count={waitingTasks.length} color="#9ca3af" collapsed={true}>
          {waitingTasks.map(t => <TaskCard key={t.id} task={t} badge="Waiting" badgeColor="#9ca3af" />)}
        </Section>

        <Section title="Ready to Start" icon="→" count={readyTasks.filter(t => t.status === "Not Started").length} color="#34d399" collapsed={true}>
          {readyTasks.filter(t => t.status === "Not Started").map(t => <TaskCard key={t.id} task={t} />)}
        </Section>

        <Section title="High Effort This Week" icon="◈" count={highEffort.length} color="#a78bfa" collapsed={true}>
          {highEffort.map(t => <TaskCard key={t.id} task={t} badge="Large" badgeColor="#a78bfa" />)}
        </Section>

      </div>
    </div>
  );
}


// --- STATUS VIEW ─────────────────────────────────────────────────────────────
const TODAY_STR = "2026-05-20";
const TODAY_DATE = new Date(TODAY_STR + "T00:00:00");

function getTrackStatus(del) {
  if (del.status === "Done") return "done";
  if (del.status === "Blocked") return "blocked";
  if (del.status === "Client Review")    return "client-review";
  const end = parseDate(del.end);
  const start = parseDate(del.start);
  // If end has passed and not done → off track
  if (end < TODAY_DATE && del.status !== "Done") return "off-track";
  // If today is past start and progress is less than expected proportion
  if (TODAY_DATE >= start) {
    const totalDuration = Math.max(1, (end - start) / 86400000);
    const elapsed = (TODAY_DATE - start) / 86400000;
    const expectedPct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
    if (del.progress < expectedPct - 20) return "at-risk";
  }
  return "on-track";
}

const trackMeta = {
  "on-track":        { label: "On Track",        color: "#34d399", bg: "rgba(52,211,153,0.12)",  icon: "●" },
  "at-risk":         { label: "At Risk",          color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  icon: "◐" },
  "off-track":       { label: "Off Track",        color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: "●" },
  "blocked":         { label: "Blocked",          color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: "⊘" },
  "done":            { label: "Complete",         color: "#6b7280", bg: "rgba(71,85,105,0.12)",   icon: "✓" },
};

const TRACK_OPTIONS = Object.keys(trackMeta);

function getCurrentTask(del) {
  // First in-progress subtask, else first not-started, else the deliverable itself
  const active = del.subtasks.find(s => s.status === "In Progress");
  if (active) return active.title;
  const next = del.subtasks.find(s => s.status === "Not Started");
  if (next) return next.title;
  if (del.status !== "Done") return del.title;
  return "Complete";
}

function StatusView({ projects, people, statusNotes, onUpdateNote, onAddDeliverable, onAddSubtask, onSaveTrackOverride, onEditItem, onOpenProject }) {
  const [editingNote, setEditingNote] = useState(null); // { projId, delId }
  const [noteText, setNoteText] = useState("");
  const [filterProj, setFilterProj] = useState("all");
  const [filterTrack, setFilterTrack] = useState("all");
  const [hideCompleted, setHideCompleted] = useState(true);
  const [statusSortCol, setStatusSortCol] = useState("end");
  const [statusSortDir, setStatusSortDir] = useState("asc");
  const toggleStatusSort = (col) => { if (statusSortCol === col) setStatusSortDir(d => d === "asc" ? "desc" : "asc"); else { setStatusSortCol(col); setStatusSortDir("asc"); } };

  const openNote = (projId, delId) => {
    const key = `${projId}::${delId}`;
    setNoteText(statusNotes[key] || "");
    setEditingNote({ projId, delId });
  };
  const saveNote = () => {
    if (!editingNote) return;
    onUpdateNote(`${editingNote.projId}::${editingNote.delId}`, noteText);
    setEditingNote(null);
  };

  // Build rows
  const rows = projects.flatMap(proj =>
    proj.deliverables.map(del => {
      const track = getTrackStatus(del);
      const assigneeNames = del.assignees
        .map(id => people.find(p => p.id === id))
        .filter(Boolean)
        .map(p => p.name.split(" ")[0])
        .join(", ");
      const key = `${proj.id}::${del.id}`;
      const activeSub = del.subtasks.find(s => s.status === "In Progress") || del.subtasks.find(s => s.status !== "Done");
      const taskEnd = activeSub?.end || del.end || "";
      return { proj, del, track, assigneeNames, note: statusNotes[key] || "", key, taskEnd };
    })
  );

  const filtered = rows
    .filter(r =>
      (filterProj === "all" || r.proj.id === filterProj) &&
      (filterTrack === "all" || r.track === filterTrack) &&
      (!hideCompleted || r.track !== "done")
    )
    .sort((a, b) => {
      let av, bv;
      if (statusSortCol === "client") { av = a.proj.client || ""; bv = b.proj.client || ""; }
      else if (statusSortCol === "project") { av = a.proj.name; bv = b.proj.name; }
      else if (statusSortCol === "deliverable") { av = a.del.title; bv = b.del.title; }
      else if (statusSortCol === "track") { av = a.track; bv = b.track; }
      else if (statusSortCol === "assigned") { av = a.assigneeNames; bv = b.assigneeNames; }
      else if (statusSortCol === "start") { av = a.del.start; bv = b.del.start; }
      else if (statusSortCol === "end") { av = a.del.end; bv = b.del.end; }
      else if (statusSortCol === "due") { av = a.del.end; bv = b.del.end; }
      else if (statusSortCol === "taskdue") { av = a.taskEnd; bv = b.taskEnd; }
      else { av = ""; bv = ""; }
      const r2 = String(av).localeCompare(String(bv));
      return statusSortDir === "asc" ? r2 : -r2;
    });

  const trackCounts = rows.reduce((acc, r) => {
    acc[r.track] = (acc[r.track] || 0) + 1; return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── Summary chips ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {Object.entries(trackMeta).map(([k, m]) => {
          const cnt = trackCounts[k] || 0;
          if (!cnt) return null;
          return (
            <div key={k} onClick={() => setFilterTrack(filterTrack === k ? "all" : k)} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "6px 14px",
              background: filterTrack === k ? m.bg : "rgba(0,0,0,0.05)",
              border: `1px solid ${filterTrack === k ? m.color + "60" : "rgba(0,0,0,0.07)"}`,
              borderRadius: 20, cursor: "pointer", transition: "all 0.12s",
            }}>
              <span style={{ color: m.color, fontSize: 10 }}>{m.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: filterTrack === k ? m.color : "#64748b" }}>{m.label}</span>
              <span style={{ fontSize: 11, color: m.color, fontWeight: 800 }}>{cnt}</span>
            </div>
          );
        })}
        {/* hide completed toggle + project filter */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: fs(11), color: "#6b7280", cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" checked={hideCompleted} onChange={e => setHideCompleted(e.target.checked)} />
            Hide completed
          </label>
          <select value={filterProj} onChange={e => setFilterProj(e.target.value)}
            style={{ ...selectStyle, width: "auto", fontSize: 11, padding: "5px 10px" }}>
            <option value="all">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Status table ── */}
      <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(75px,0.9fr) minmax(95px,1.2fr) minmax(100px,1.3fr) minmax(100px,1.3fr) minmax(75px,0.65fr) minmax(55px,0.55fr) minmax(65px,0.6fr) minmax(65px,0.6fr) minmax(65px,0.6fr) minmax(110px,1.8fr) minmax(65px,0.65fr)", gap: 0, borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#eceef2" }}>
          {[["Client","client"],["Project","project"],["Deliverable","deliverable"],["Current Task",null],["Track","track"],["Dept",null],["Proj Due","due"],["Task Due","taskdue"],["Team","assigned"],["Notes",null],["",null]].map(([h, col], i) => (
            <div key={i} onClick={col ? () => toggleStatusSort(col) : undefined}
              style={{ padding: "7px 10px", fontSize: 9, fontWeight: 700, color: col ? (statusSortCol === col ? BRAND_TEAL_D : "#6b7280") : "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", borderRight: i < 6 ? "1px solid rgba(0,0,0,0.06)" : "none", cursor: col ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}>
              {h}{col && statusSortCol === col ? (statusSortDir === "asc" ? " ↑" : " ↓") : ""}
            </div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 12 }}>No deliverables match the current filter.</div>
        )}
        {filtered.map(({ proj, del, track, assigneeNames, note, key, taskEnd }, i) => {
          const m = trackMeta[track];
          const currentTask = getCurrentTask(del);
          const isDone = track === "done";
          return (
            <div key={key} style={{
              display: "grid", gridTemplateColumns: "minmax(75px,0.9fr) minmax(95px,1.2fr) minmax(100px,1.3fr) minmax(100px,1.3fr) minmax(75px,0.65fr) minmax(55px,0.55fr) minmax(65px,0.6fr) minmax(65px,0.6fr) minmax(65px,0.6fr) minmax(110px,1.8fr) minmax(65px,0.65fr)",
              borderBottom: i < filtered.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
              opacity: isDone ? 0.5 : 1, transition: "opacity 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

              {/* Client */}
              <Cell border>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#4b5563" }}>{proj.client || "—"}</span>
              </Cell>

              {/* Project */}
              <Cell border>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: proj.color, flexShrink: 0 }} />
                  <span onClick={() => onOpenProject && onOpenProject(proj.id)} style={{ fontSize: 11, color: proj.color, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 2 }} title="View project details">{proj.name}</span>
                </div>
              </Cell>

              {/* Deliverable — click to edit */}
              <Cell border>
                <span onClick={() => onEditItem && onEditItem({ ...del, projectId: proj.id, projectName: proj.name, projectColor: proj.color })}
                  style={{ fontSize: 12, fontWeight: 700, color: isDone ? "#9ca3af" : "#111827", textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: onEditItem ? "pointer" : "default", textUnderlineOffset: 2 }}
                  title="Click to edit">{del.title}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <div style={{ flex: 1, height: 3, background: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${del.progress}%`, height: "100%", background: proj.color, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 9, color: "#6b7280", flexShrink: 0 }}>{del.progress}%</span>
                </div>
              </Cell>

              {/* Current Task — click to edit active subtask or deliverable */}
              <Cell border>
                <span onClick={() => {
                  if (!onEditItem) return;
                  const activeSub = del.subtasks.find(s => s.status === "In Progress") || del.subtasks.find(s => s.status === "Not Started");
                  if (activeSub) {
                    onEditItem({ ...activeSub, projectId: proj.id, projectName: proj.name, projectColor: proj.color, deliverableId: del.id, delTitle: del.title });
                  } else {
                    onEditItem({ ...del, projectId: proj.id, projectName: proj.name, projectColor: proj.color });
                  }
                }} style={{ fontSize: 11, color: isDone ? "#9ca3af" : "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: onEditItem ? "pointer" : "default" }} title="Click to edit">
                  {isDone ? "✓ Complete" : currentTask}
                </span>
              </Cell>

              {/* Track — with manual override */}
              <Cell border>
                <div style={{ position: "relative" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: m.bg, color: m.color,
                    border: `1px solid ${m.color}40`,
                    borderRadius: 4, padding: "3px 7px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                    title="Click to override track status"
                    onClick={e => {
                      const sel = e.currentTarget.nextSibling;
                      sel.style.display = sel.style.display === "block" ? "none" : "block";
                    }}
                  >{m.icon} {m.label} ▾</span>
                  <select defaultValue="" style={{ display: "none", position: "absolute", top: "100%", left: 0, zIndex: 50,
                    background: "#fff", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 6, fontSize: 11,
                    padding: "4px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 130, fontFamily: "inherit" }}
                    onChange={e => {
                      const val = e.target.value;
                      e.target.style.display = "none";
                      onSaveTrackOverride(proj.id, del.id, val || null);
                    }}>
                    <option value="">— Auto —</option>
                    {TRACK_OPTIONS.map(t => <option key={t} value={t}>{trackMeta[t]?.label || t}</option>)}
                  </select>
                </div>
              </Cell>

              {/* Department */}
              <Cell border>
                {del.department
                  ? <DeptBadge dept={del.department} />
                  : <span style={{ fontSize: 10, color: "#9ca3af" }}>—</span>
                }
              </Cell>

              {/* Due Date */}
              <Cell border>
                <span style={{ fontSize: 11, fontWeight: 600, color: del.end && parseDate(del.end) < TODAY_DATE && del.status !== "Done" ? "#f87171" : "#374151", whiteSpace: "nowrap" }}>
                  {del.end ? fmt(parseDate(del.end)) : "—"}
                </span>
              </Cell>

              {/* Task Due — active subtask's end date */}
              <Cell border>
                <span style={{ fontSize: 11, fontWeight: 600, color: taskEnd && parseDate(taskEnd) < TODAY_DATE && !isDone ? "#f87171" : "#374151", whiteSpace: "nowrap" }}>
                  {taskEnd && taskEnd !== del.end ? fmt(parseDate(taskEnd)) : "—"}
                </span>
              </Cell>

              {/* Team */}
              <Cell border>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  {del.assignees.slice(0, 3).map(id => {
                    const p = people.find(x => x.id === id);
                    return p ? <div key={id}><Avatar person={p} size={20} /></div> : null;
                  })}
                  {del.assignees.length === 0 && <span style={{ fontSize: 10, color: "#9ca3af" }}>—</span>}
                </div>
                {assigneeNames && <div style={{ fontSize: 9, color: "#6b7280", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{assigneeNames}</div>}
              </Cell>

              {/* Status Notes — inline editable, syncs with timeline */}
              <StatusNoteCell
                note={note}
                color={proj.color}
                onSave={(text) => onUpdateNote(key, text)}
              />

              {/* Actions */}
              <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 5, borderLeft: "1px solid rgba(0,0,0,0.05)" }}>
                <button onClick={() => onAddDeliverable(proj)} style={{
                  background: proj.color + "12", border: `1px solid ${proj.color}40`,
                  color: proj.color, borderRadius: 4, padding: "3px 7px", cursor: "pointer",
                  fontSize: 9, fontWeight: 800, fontFamily: "inherit", whiteSpace: "nowrap",
                }}>+ Deliverable</button>
                <button onClick={() => { const fullDel = proj.deliverables.find(d => d.id === del.id); onAddSubtask(proj, fullDel || del); }} style={{
                  background: "none", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 4,
                  color: "#6b7280", padding: "3px 7px", cursor: "pointer",
                  fontSize: 9, fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap",
                }}>+ Subtask</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Note editor inline modal ── */}
      {editingNote && (
        <Overlay onClose={() => setEditingNote(null)}>
          <ModalShell
            title={(() => {
              const proj = projects.find(p => p.id === editingNote.projId);
              const del = proj ? proj.deliverables.find(d => d.id === editingNote.delId) : null;
              const projColor = proj ? proj.color : "#f59e0b";
              const delTitle = del ? del.title : "";
              return <span>Status Notes <span style={{ color: projColor, fontWeight: 400 }}>— {delTitle}</span></span>;
            })()}
            accentColor={(projects.find(p => p.id === editingNote.projId) || {color: "#f59e0b"}).color}
            onClose={() => setEditingNote(null)}
            width={500}
          >
            <div style={{ padding: 20 }}>
              <div style={labelStyle}>Notes / Next Steps</div>
              <textarea
                autoFocus
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder={"e.g. Waiting on client approval for copy revisions.\nNext: send revised draft by Friday."}
                style={{
                  ...selectStyle, width: "100%", height: 130, resize: "vertical",
                  lineHeight: 1.6, fontFamily: "inherit", fontSize: 12,
                }}
              />
            </div>
            <ModalFooter onClose={() => setEditingNote(null)} onSave={saveNote} saveLabel="Save Note"
              color={(projects.find(p => p.id === editingNote.projId) || {color: "#f59e0b"}).color} />
          </ModalShell>
        </Overlay>
      )}
    </div>
  );
}

// Small cell wrapper for status table
function Cell({ children, border }) {
  return (
    <div style={{
      padding: "10px 14px", display: "flex", flexDirection: "column", justifyContent: "center",
      borderRight: border ? "1px solid rgba(0,0,0,0.06)" : "none", overflow: "hidden", gap: 2,
    }}>{children}</div>
  );
}

function StatusNoteCell({ note, color, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);
  useEffect(() => { setDraft(note); }, [note]);
  const commit = () => { setEditing(false); if (draft !== note) onSave(draft); };
  return (
    <div style={{ padding: "8px 10px", display: "flex", alignItems: "flex-start", minWidth: 0, overflow: "hidden" }}>
      {editing ? (
        <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Escape") { setDraft(note); setEditing(false); } if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); } }}
          style={{ width: "100%", border: `1px solid ${color}60`, borderRadius: 4, padding: "4px 8px", fontSize: 11, fontFamily: "inherit", resize: "none", height: 60, outline: "none", background: "#fff", color: "#1f2937", lineHeight: 1.5 }}
        />
      ) : note ? (
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.5, whiteSpace: "pre-wrap", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{note}</div>
          <button onClick={() => setEditing(true)} style={{ marginTop: 2, background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 9, fontFamily: "inherit", padding: 0 }}>edit ✎</button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} style={{ background: "none", border: "1px dashed rgba(0,0,0,0.1)", borderRadius: 4, color: "#9ca3af", cursor: "pointer", padding: "3px 8px", fontSize: 10, fontFamily: "inherit", whiteSpace: "nowrap" }}>+ note</button>
      )}
    </div>
  );
}

// --- TEAM SETTINGS MODAL ─────────────────────────────────────────────────────
const MEMBER_COLORS = [
  "#f59e0b","#38bdf8","#a78bfa","#34d399","#f87171",
  "#fb923c","#e879f9","#4ade80","#60a5fa","#facc15","#64748b",
];

function TeamSettingsModal({ people, onClose, onSave }) {
  const [members, setMembers] = useState(people.map(p => ({ ...p })));
  const updateMember = (id, field, val) =>
    setMembers(ms => ms.map(m => m.id !== id ? m : { ...m, [field]: val }));

  const addMember = () => {
    const usedColors = members.map(m => m.color);
    const color = MEMBER_COLORS.find(c => !usedColors.includes(c)) || MEMBER_COLORS[0];
    setMembers(ms => [...ms, { id: "p_" + Date.now(), name: "", color }]);
  };

  const removeMember = (id) => setMembers(ms => ms.filter(m => m.id !== id));

  const handleSave = () => {
    onSave(members.filter(m => m.name.trim()));
    onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <ModalShell title="Team Members" onClose={onClose} accentColor="#38bdf8" width={480}>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: fs(11), color: "#6b7280", marginBottom: 4 }}>
            Edit names or colors. Changes apply across all projects.
          </div>
          {members.map((m, i) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Color picker trigger */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Avatar person={{ ...m, name: m.name || "?" }} size={34} />
                <select
                  value={m.color}
                  onChange={e => updateMember(m.id, "color", e.target.value)}
                  style={{
                    position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%",
                  }}
                  title="Change color"
                >
                  {MEMBER_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {/* Name input */}
              <input
                value={m.name}
                onChange={e => updateMember(m.id, "name", e.target.value)}
                placeholder="Full name"
                style={{ ...selectStyle, flex: 1, fontSize: 13 }}
              />
              {/* Color swatches inline */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {MEMBER_COLORS.slice(0, 6).map(c => (
                  <div key={c} onClick={() => updateMember(m.id, "color", c)} style={{
                    width: 16, height: 16, borderRadius: "50%", background: c, cursor: "pointer",
                    border: m.color === c ? "2px solid #fff" : "2px solid transparent",
                    flexShrink: 0, transition: "border 0.1s",
                  }} />
                ))}
                {MEMBER_COLORS.slice(6).map(c => (
                  <div key={c} onClick={() => updateMember(m.id, "color", c)} style={{
                    width: 16, height: 16, borderRadius: "50%", background: c, cursor: "pointer",
                    border: m.color === c ? "2px solid #fff" : "2px solid transparent",
                    flexShrink: 0, transition: "border 0.1s",
                  }} />
                ))}
              </div>
              {/* Remove */}
              <button onClick={() => removeMember(m.id)} style={{
                background: "none", border: "none", color: "#9ca3af", cursor: "pointer",
                fontSize: 16, lineHeight: 1, padding: "0 2px", flexShrink: 0,
                transition: "color 0.12s",
              }}
                onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                onMouseLeave={e => e.currentTarget.style.color = "#334155"}
              >×</button>
            </div>
          ))}
          <button onClick={addMember} style={{
            marginTop: 4, background: "none", border: "1px dashed rgba(0,0,0,0.09)",
            borderRadius: 6, color: "#9ca3af", padding: "7px", cursor: "pointer",
            fontSize: 11, fontFamily: "inherit", transition: "all 0.12s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(56,189,248,0.6)"; e.currentTarget.style.color = "#0284c7"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.09)"; e.currentTarget.style.color = "#334155"; }}
          >+ Add team member</button>
        </div>
        <ModalFooter onClose={onClose} onSave={handleSave} saveLabel="Save Team" color="#38bdf8" />
      </ModalShell>
    </Overlay>
  );
}

// --- PROJECT OPTIONS POPOVER ──────────────────────────────────────────────────
function ProjectMenu({ proj, onClose, onArchive, onDelete, onRename, onSaveAsTemplate }) {
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState(proj.name);
  const [clientVal, setClientVal] = useState(proj.client || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Overlay onClose={onClose}>
      <ModalShell
        title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: proj.color, display: "inline-block" }} />
          {proj.name}
        </span>}
        accentColor={proj.color} onClose={onClose} width={380}
      >
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Rename */}
          {renaming ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 0" }}>
              <div>
                <div style={labelStyle}>Project Name</div>
                <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
                  style={{ ...selectStyle, width: "100%" }} />
              </div>
              <div>
                <div style={labelStyle}>Client Name</div>
                <input value={clientVal} onChange={e => setClientVal(e.target.value)}
                  style={{ ...selectStyle, width: "100%" }} placeholder="e.g. Acme Corp" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setRenaming(false)} style={cancelBtnStyle}>Cancel</button>
                <button onClick={() => { onRename(proj.id, nameVal.trim(), clientVal.trim()); onClose(); }}
                  style={{ ...cancelBtnStyle, background: proj.color, color: "#000", border: "none", fontWeight: 800 }}>Save</button>
              </div>
            </div>
          ) : (
            <MenuRow icon="✎" label="Rename / Edit details" onClick={() => setRenaming(true)} color="#94a3b8" />
          )}

          <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "4px 0" }} />

          {/* Save as template */}
          <MenuRow icon="📋" label="Save as Template" sub="Reuse this structure for future projects." onClick={() => { onSaveAsTemplate(proj); onClose(); }} color="#a78bfa" />

          <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "4px 0" }} />

          {/* Archive */}
          <MenuRow icon="⊡" label="Archive project" sub="Hides from active views. Recoverable." onClick={() => { onArchive(proj.id); onClose(); }} color="#fbbf24" />

          <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "4px 0" }} />

          {/* Delete */}
          {confirmDelete ? (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#f87171", marginBottom: 12, fontWeight: 600 }}>
                Permanently delete "{proj.name}"? This cannot be undone.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirmDelete(false)} style={cancelBtnStyle}>Cancel</button>
                <button onClick={() => { onDelete(proj.id); onClose(); }}
                  style={{ ...cancelBtnStyle, background: "#f87171", color: "#000", border: "none", fontWeight: 800 }}>Delete Forever</button>
              </div>
            </div>
          ) : (
            <MenuRow icon="⊗" label="Delete project" sub="Permanently removes all data." onClick={() => setConfirmDelete(true)} color="#f87171" />
          )}
        </div>
      </ModalShell>
    </Overlay>
  );
}

function MenuRow({ icon, label, sub, onClick, color }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 7,
        cursor: "pointer", background: hov ? "rgba(0,0,0,0.05)" : "transparent", transition: "background 0.12s",
      }}>
      <span style={{ fontSize: 16, color, width: 20, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: hov ? "#f1f5f9" : "#94a3b8", transition: "color 0.12s" }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// --- EXCEL IMPORT MODAL ───────────────────────────────────────────────────────

// ─── HOLIDAYS ────────────────────────────────────────────────────────────────
function HolidaysModal({ holidays, onClose, onSave }) {
  const [list, setList] = useState(holidays.map(h => ({ ...h })));
  const [newDate, setNewDate] = useState("");
  const [newName, setNewName] = useState("");

  const add = () => {
    if (!newDate) return;
    if (list.some(h => h.date === newDate)) return;
    setList(l => [...l, { date: newDate, name: newName.trim() || "Holiday" }].sort((a,b) => a.date.localeCompare(b.date)));
    setNewDate(""); setNewName("");
  };

  const remove = (date) => setList(l => l.filter(h => h.date !== date));

  return (
    <Overlay onClose={onClose}>
      <ModalShell title="Holidays & Blackout Dates" onClose={onClose} accentColor="#fb923c" width={440}>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Holidays are shown on the timeline and automatically skipped by date calculations.
          </div>
          {/* Add row */}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Date</div>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                style={{ ...selectStyle, width: "100%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Name (optional)</div>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="e.g. July 4th" onKeyDown={e => e.key === "Enter" && add()}
                style={{ ...selectStyle, width: "100%" }} />
            </div>
            <button onClick={add} style={{
              background: "#fb923c", border: "none", borderRadius: 6, color: "#fff",
              padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "inherit", flexShrink: 0,
            }}>Add</button>
          </div>
          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
            {list.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 16 }}>No holidays added yet.</div>}
            {list.map(h => (
              <div key={h.date} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                background: "#fff8f4", border: "1px solid rgba(251,146,60,0.25)", borderRadius: 7 }}>
                <span style={{ fontSize: 13 }}>🗓</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1f2937", flex: 1 }}>{h.name}</span>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{fmt(parseDate(h.date))}</span>
                <button onClick={() => remove(h.date)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        </div>
        <ModalFooter onClose={onClose} onSave={() => { onSave(list); onClose(); }} saveLabel="Save Holidays" color="#fb923c" />
      </ModalShell>
    </Overlay>
  );
}

// Helper: advance a date string by n working days (skipping holidays)
function addWorkingDays(dateStr, days, holidayDates) {
  const hSet = new Set(holidayDates);
  let d = new Date(dateStr + "T00:00:00");
  let added = 0;
  while (added < days) {
    d = new Date(d.getTime() + 86400000);
    const ds = d.toISOString().slice(0,10);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6 && !hSet.has(ds)) added++;
  }
  return d.toISOString().slice(0,10);
}

function ExcelImportModal({ onClose, onImport, existingColors }) {
  const [step, setStep] = useState("upload"); // upload → map → preview → done
  const [rows, setRows] = useState([]);        // raw rows from sheet
  const [headers, setHeaders] = useState([]);  // column headers
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [xlsxReady, setXlsxReady] = useState(!!window.XLSX);

  // Load SheetJS via script tag if not already present
  useEffect(() => {
    if (window.XLSX) { setXlsxReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => setXlsxReady(true);
    script.onerror = () => setError("Could not load Excel library. Check your connection.");
    document.head.appendChild(script);
  }, []);
  const [projectName, setProjectName] = useState("");
  const [projectColor, setProjectColor] = useState(
    PROJECT_COLORS.find(c => !existingColors.includes(c)) || PROJECT_COLORS[0]
  );

  // Column mapping state
  const [colMap, setColMap] = useState({
    title: "", start: "", end: "", assignees: "", dependencies: "", type: "",
  });
  const setCol = (k, v) => setColMap(m => ({ ...m, [k]: v }));

  // Parsed preview
  const [parsed, setParsed] = useState(null); // { deliverables: [...] }

  // ── Step 1: read file ──
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    setFileName(file.name);
    if (!window.XLSX) { setError("Excel library not loaded yet. Please wait a moment and try again."); return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const XLSX = window.XLSX;
        const buf = evt.target.result;
        const wb = XLSX.read(buf, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (data.length < 2) { setError("Sheet appears empty."); return; }
        const hdrs = data[0].map(h => String(h).trim());
        setHeaders(hdrs);
        setRows(data.slice(1).filter(r => r.some(c => c !== "")));
        const guess = (keywords) => hdrs.find(h => keywords.some(k => h.toLowerCase().includes(k))) || "";
        setColMap({
          title:        guess(["task","name","title","deliverable","item","subject"]),
          start:        guess(["start","begin","from"]),
          end:          guess(["end","due","finish","complete","deadline"]),
          assignees:    guess(["assign","owner","who","person","resource"]),
          dependencies: guess(["depend","predecessor","blocker","after"]),
          type:         guess(["type","level","kind","indent","tier","parent"]),
        });
        setProjectName(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
        setStep("map");
      } catch (err) {
        setError("Could not read file. Make sure it's a valid .xlsx or .xls file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Step 2: parse with column map ──
  const fmtDate = (val) => {
    if (!val) return "";
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    // Try parsing string dates
    const d = new Date(val);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
    return String(val);
  };

  const buildPreview = () => {
    if (!colMap.title) { setError("Title column is required."); return; }
    setError("");

    const titleIdx       = headers.indexOf(colMap.title);
    const startIdx       = colMap.start       ? headers.indexOf(colMap.start)       : -1;
    const endIdx         = colMap.end         ? headers.indexOf(colMap.end)         : -1;
    const assigneesIdx   = colMap.assignees   ? headers.indexOf(colMap.assignees)   : -1;
    const depsIdx        = colMap.dependencies? headers.indexOf(colMap.dependencies): -1;
    const typeIdx        = colMap.type        ? headers.indexOf(colMap.type)        : -1;

    const today = "2026-05-20";
    const deliverables = [];
    let currentDel = null;

    rows.forEach((row, i) => {
      const rawTitle = String(row[titleIdx] || "").trim();
      if (!rawTitle) return;

      const start = startIdx >= 0 ? fmtDate(row[startIdx]) || today : today;
      const end   = endIdx   >= 0 ? fmtDate(row[endIdx])   || today : today;

      // Detect type: explicit "type" column, or indentation heuristic
      let isSubtask = false;
      if (typeIdx >= 0) {
        const typeVal = String(row[typeIdx]).toLowerCase();
        isSubtask = ["subtask","sub-task","sub task","task","step","child","2","indented"].some(k => typeVal.includes(k));
      } else {
        // Heuristic: original cell has leading spaces, or title starts with spaces/dash/bullet
        const rawCell = String(row[titleIdx] || "");
        isSubtask = rawCell.startsWith("  ") || rawCell.startsWith("\t") || /^[-•*]/.test(rawCell.trim()) && currentDel !== null;
        // Also: if no type col, every row after first is a subtask of the nearest non-indented row
        if (!isSubtask && currentDel && rawTitle.length > 0) {
          // try to detect by checking if first column (col 0) is empty but titleIdx col has content
          if (titleIdx > 0 && String(row[0] || "").trim() === "" && rawTitle) {
            isSubtask = true;
          }
        }
      }

      const assigneesRaw = assigneesIdx >= 0 ? String(row[assigneesIdx] || "") : "";
      const depsRaw      = depsIdx      >= 0 ? String(row[depsIdx]      || "") : "";

      const item = {
        id: `imp_${i}_${Date.now()}`,
        title: rawTitle,
        start: start || today,
        end:   end   || today,
        assigneesRaw,
        depsRaw,
        status: "Not Started", priority: "Medium", progress: 0, dependencies: [],
        assignees: [],
      };

      if (!isSubtask) {
        currentDel = { ...item, subtasks: [] };
        deliverables.push(currentDel);
      } else {
        if (!currentDel) {
          // No parent yet — create a placeholder deliverable
          currentDel = { id: `imp_ph_${i}`, title: "Imported Tasks", start: today, end: today, status: "Not Started", priority: "Medium", progress: 0, dependencies: [], assignees: [], assigneesRaw: "", depsRaw: "", subtasks: [] };
          deliverables.push(currentDel);
        }
        currentDel.subtasks.push(item);
      }
    });

    setParsed({ deliverables });
    setStep("preview");
  };

  // ── Step 3: commit ──
  const handleImport = () => {
    if (!projectName.trim()) { setError("Project name is required."); return; }
    const project = {
      id: "proj_" + Date.now(),
      name: projectName.trim(),
      color: projectColor,
      deliverables: parsed.deliverables.map(del => ({
        ...del,
        subtasks: del.subtasks.map(s => ({ ...s })),
      })),
    };
    onImport(project);
    onClose();
  };

  const ColSelect = ({ field, label }) => (
    <div>
      <div style={labelStyle}>{label}</div>
      <select value={colMap[field]} onChange={e => setCol(field, e.target.value)} style={selectStyle}>
        <option value="">— skip —</option>
        {headers.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  );

  return (
    <Overlay onClose={onClose}>
      <ModalShell title="Import from Excel" onClose={onClose} accentColor="#34d399" width={600}>

        {/* ── STEP INDICATOR ── */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          {[["upload","1. Upload"],["map","2. Map Columns"],["preview","3. Preview"]].map(([s, lbl]) => (
            <div key={s} style={{
              flex: 1, padding: "10px 0", textAlign: "center", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.07em", color: step === s ? "#34d399" : step > s ? "#475569" : "#9ca3af",
              borderBottom: step === s ? "2px solid #34d399" : "2px solid transparent",
              transition: "all 0.15s",
            }}>{lbl}</div>
          ))}
        </div>

        <div style={{ padding: 22 }}>

          {/* ── STEP 1: UPLOAD ── */}
          {step === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                Upload an <span style={{ color: "#34d399" }}>.xlsx</span> or <span style={{ color: "#34d399" }}>.xls</span> file.
                The first row should be column headers. Deliverables and their subtasks should be on consecutive rows —
                subtasks are detected by indentation, a leading dash, or a "Type" column.
              </div>
              {/* Drag-drop zone */}
              <label style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 10, padding: "32px 20px", border: "1.5px dashed rgba(52,211,153,0.3)",
                borderRadius: 10, cursor: "pointer", background: "rgba(52,211,153,0.04)",
                transition: "all 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(52,211,153,0.6)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(52,211,153,0.3)"}
              >
                <div style={{ fontSize: 28 }}>📊</div>
                <div style={{ fontSize: fs(13), color: "#6b7280" }}>{fileName || "Click to choose a file, or drag &amp; drop"}</div>
                <div style={{ fontSize: 10, color: xlsxReady ? "#334155" : "#fbbf24" }}>{xlsxReady ? ".xlsx · .xls" : "Loading Excel library…"}</div>
                <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
              </label>
              {error && <div style={{ fontSize: 11, color: "#f87171" }}>{error}</div>}

              {/* Sample format hint */}
              <div style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>EXPECTED FORMAT</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                  <thead>
                    <tr>{["Task Name","Start","End","Assignee","Dependencies"].map(h => (
                      <th key={h} style={{ padding: "4px 8px", background: "rgba(0,0,0,0.06)", color: "#6b7280", textAlign: "left", fontWeight: 700, borderRadius: 2 }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {[
                      ["Email 1 — Welcome","2026-05-01","2026-05-15","Maya Chen",""],
                      ["  Copy development","2026-05-01","2026-05-05","Jordan",""],
                      ["  Internal review","2026-05-05","2026-05-08","Sam","Copy development"],
                      ["Email 2 — Promo","2026-05-15","2026-05-28","Maya","Email 1 — Welcome"],
                    ].map((r, i) => (
                      <tr key={i}>{r.map((c, j) => (
                        <td key={j} style={{ padding: "3px 8px", color: c.startsWith("  ") ? "#64748b" : "#94a3b8", borderTop: "1px solid rgba(0,0,0,0.05)" }}>{c}</td>
                      ))}</tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 8 }}>Subtasks are indented with spaces, a tab, or a leading dash/bullet.</div>
              </div>
            </div>
          )}

          {/* ── STEP 2: MAP COLUMNS ── */}
          {step === "map" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {rows.length} rows found in <span style={{ color: "#111827" }}>{fileName}</span>. Match your columns below.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <ColSelect field="title" label="Task / Deliverable Name *" />
                <ColSelect field="type"  label="Type / Level (optional)" />
                <ColSelect field="start" label="Start Date" />
                <ColSelect field="end"   label="End Date" />
                <ColSelect field="assignees"   label="Assignee(s)" />
                <ColSelect field="dependencies" label="Dependencies" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={labelStyle}>Project Name</div>
                  <input value={projectName} onChange={e => setProjectName(e.target.value)}
                    style={{ ...selectStyle, width: "100%" }} placeholder="Name this project" />
                </div>
                <div>
                  <div style={labelStyle}>Project Color</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 2 }}>
                    {PROJECT_COLORS.map(c => (
                      <div key={c} onClick={() => setProjectColor(c)} style={{
                        width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer",
                        border: projectColor === c ? "3px solid #fff" : "3px solid transparent",
                        boxShadow: projectColor === c ? `0 0 0 2px ${c}` : "none",
                        transition: "all 0.1s", flexShrink: 0,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
              {error && <div style={{ fontSize: 11, color: "#f87171" }}>{error}</div>}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button onClick={() => setStep("upload")} style={cancelBtnStyle}>← Back</button>
                <button onClick={buildPreview} style={{ ...cancelBtnStyle, background: "#34d399", color: "#000", border: "none", fontWeight: 800 }}>Preview Import →</button>
              </div>
            </div>
          )}

          {/* ── STEP 3: PREVIEW ── */}
          {step === "preview" && parsed && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: projectColor }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{projectName}</span>
                <span style={{ fontSize: fs(11), color: "#6b7280" }}>— {parsed.deliverables.length} deliverables, {parsed.deliverables.reduce((s, d) => s + d.subtasks.length, 0)} subtasks</span>
              </div>
              <div style={{ maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {parsed.deliverables.map((del, di) => (
                  <div key={del.id} style={{ background: "rgba(0,0,0,0.04)", border: `1px solid ${projectColor}28`, borderLeft: `3px solid ${projectColor}`, borderRadius: 6, overflow: "hidden" }}>
                    {/* Deliverable */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: projectColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1f2937", flex: 1 }}>{del.title}</span>
                      <span style={{ fontSize: 10, color: "#6b7280" }}>{del.start && del.start !== "2026-05-20" ? fmt(parseDate(del.start)) : "—"} → {del.end && del.end !== "2026-05-20" ? fmt(parseDate(del.end)) : "—"}</span>
                      {del.assigneesRaw && <span style={{ fontSize: 10, color: "#6b7280" }}>👤 {del.assigneesRaw}</span>}
                    </div>
                    {/* Subtasks */}
                    {del.subtasks.map((sub, si) => (
                      <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 12px 5px 28px", borderTop: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.04)" }}>
                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#475569", flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: "#4b5563", flex: 1 }}>{sub.title}</span>
                        <span style={{ fontSize: 10, color: "#9ca3af" }}>{sub.start && sub.start !== "2026-05-20" ? fmt(parseDate(sub.start)) : "—"} → {sub.end && sub.end !== "2026-05-20" ? fmt(parseDate(sub.end)) : "—"}</span>
                        {sub.assigneesRaw && <span style={{ fontSize: 10, color: "#6b7280" }}>👤 {sub.assigneesRaw}</span>}
                      </div>
                    ))}
                    {del.subtasks.length === 0 && (
                      <div style={{ padding: "4px 28px 6px", fontSize: 10, color: "#9ca3af" }}>No subtasks detected</div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: fs(11), color: "#6b7280", background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 6, padding: "8px 12px" }}>
                ✓ Assignees and dependencies will be stored as text — you can link them to team members after import by editing each item.
              </div>
              {error && <div style={{ fontSize: 11, color: "#f87171" }}>{error}</div>}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button onClick={() => setStep("map")} style={cancelBtnStyle}>← Back</button>
                <button onClick={handleImport} style={{ ...cancelBtnStyle, background: projectColor, color: "#000", border: "none", fontWeight: 800 }}>Import Project →</button>
              </div>
            </div>
          )}
        </div>
      </ModalShell>
    </Overlay>
  );
}

// --- COLOR PALETTE FOR NEW PROJECTS ──────────────────────────────────────────
const PROJECT_COLORS = [
  "#f59e0b","#38bdf8","#a78bfa","#34d399","#f87171",
  "#fb923c","#e879f9","#4ade80","#60a5fa","#facc15",
];

// ─── BUILT-IN TEMPLATES ───────────────────────────────────────────────────────
const BUILT_IN_TEMPLATES = [
  {
    id: "tpl_email", name: "Email Campaign", icon: "✉",
    deliverables: [
      { title: "Email 1", subtasks: ["Copy Development","Internal Review","Revisions","Design & Build","QA & Send"] },
      { title: "Email 2", subtasks: ["Copy Development","Internal Review","Revisions","Design & Build","QA & Send"] },
      { title: "Email 3", subtasks: ["Copy Development","Internal Review","Revisions","Design & Build","QA & Send"] },
    ],
  },
  {
    id: "tpl_video", name: "Video Production", icon: "▶",
    deliverables: [
      { title: "Hero Video", subtasks: ["Creative Brief","Script Development","Client Review","Production","Edit & Post","Final Approval"] },
      { title: "Social Cut 15s", subtasks: ["Edit from Hero","Motion Graphics","Internal Review","Revisions & Export"] },
      { title: "Social Cut 30s", subtasks: ["Edit from Hero","Motion Graphics","Internal Review","Revisions & Export"] },
    ],
  },
  {
    id: "tpl_print", name: "Print / Collateral", icon: "◧",
    deliverables: [
      { title: "One-Pager", subtasks: ["Copy Development","Internal Review","Revisions","Design Layout","Proofreading","Print-Ready Export"] },
      { title: "Brochure", subtasks: ["Copy Development","Internal Review","Revisions","Design Layout","Proofreading","Print-Ready Export"] },
      { title: "Banner Set", subtasks: ["Concept","Design","Client Review","Revisions","Final Export"] },
    ],
  },
  {
    id: "tpl_launch", name: "Product Launch", icon: "🚀",
    deliverables: [
      { title: "Press Release", subtasks: ["First Draft","Legal Review","Revisions","Final Approval"] },
      { title: "Landing Page", subtasks: ["Wireframe","Copy Development","Visual Design","Client Review","Development & QA"] },
      { title: "Sales Deck", subtasks: ["Slide Outline","Copy Development","Design & Layout","Client Review","Revisions & Final"] },
      { title: "Social Toolkit", subtasks: ["Copy — Captions","Static Graphics","Internal Review","Revisions","Package & Deliver"] },
    ],
  },
];

function buildProjectFromTemplate(tpl, name, client, color, startDate) {
  const start = new Date(startDate + "T00:00:00");
  let cursor = new Date(start);
  const deliverables = tpl.deliverables.map((d, di) => {
    const delStart = new Date(cursor);
    const subtasks = d.subtasks.map((title, si) => {
      const subStart = new Date(cursor);
      const subEnd = new Date(cursor.getTime() + 2 * 86400000);
      cursor = new Date(subEnd.getTime() + 86400000);
      return {
        id: `s_tpl_${di}_${si}_${Date.now()}`, title, status: "Not Started", priority: "Medium",
        assignees: [], start: subStart.toISOString().slice(0,10), end: subEnd.toISOString().slice(0,10),
        progress: 0, dependencies: [], department: "", depsText: "",
      };
    });
    const delEnd = subtasks.length ? subtasks[subtasks.length-1].end : new Date(cursor.getTime() + 6*86400000).toISOString().slice(0,10);
    cursor = new Date(new Date(delEnd).getTime() + 86400000);
    return {
      id: `d_tpl_${di}_${Date.now()}`, title: d.title, status: "Not Started", priority: "Medium",
      assignees: [], start: delStart.toISOString().slice(0,10), end: delEnd,
      progress: 0, dependencies: [], department: "", depsText: "", subtasks,
    };
  });
  return { id: "proj_" + Date.now(), name, client, color, deliverables };
}

function TemplatesModal({ onClose, onAdd, existingColors, savedTemplates, onSaveTemplate }) {
  const defaultColor = PROJECT_COLORS.find(c => !existingColors.includes(c)) || PROJECT_COLORS[0];
  const [tab, setTab] = useState("use");
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [startDate, setStartDate] = useState("2026-05-20");
  const [error, setError] = useState("");
  const [tplName, setTplName] = useState("");
  const [tplIcon, setTplIcon] = useState("📋");
  const [tplDeliverables, setTplDeliverables] = useState([{ title: "", subtasks: [""] }]);

  const allTemplates = [...BUILT_IN_TEMPLATES, ...(savedTemplates || [])];

  const handleCreate = () => {
    if (!selected) { setError("Choose a template."); return; }
    if (!name.trim()) { setError("Project name required."); return; }
    const proj = buildProjectFromTemplate(selected, name.trim(), client.trim(), color, startDate);
    onAdd(proj); onClose();
  };

  const addDeliverable = () => setTplDeliverables(d => [...d, { title: "", subtasks: [""] }]);
  const removeDeliverable = (i) => setTplDeliverables(d => d.filter((_, idx) => idx !== i));
  const updateDelTitle = (i, v) => setTplDeliverables(d => d.map((x, idx) => idx !== i ? x : { ...x, title: v }));
  const addSubtask = (i) => setTplDeliverables(d => d.map((x, idx) => idx !== i ? x : { ...x, subtasks: [...x.subtasks, ""] }));
  const removeSubtask = (di, si) => setTplDeliverables(d => d.map((x, idx) => idx !== di ? x : { ...x, subtasks: x.subtasks.filter((_, si2) => si2 !== si) }));
  const updateSubtask = (di, si, v) => setTplDeliverables(d => d.map((x, idx) => idx !== di ? x : { ...x, subtasks: x.subtasks.map((s, si2) => si2 !== si ? s : v) }));

  const handleSaveTemplate = () => {
    if (!tplName.trim()) { setError("Template name required."); return; }
    const tpl = {
      id: "tpl_custom_" + Date.now(), name: tplName.trim(), icon: tplIcon,
      deliverables: tplDeliverables.filter(d => d.title.trim()).map(d => ({
        title: d.title.trim(), subtasks: d.subtasks.filter(s => s.trim()),
      })),
    };
    onSaveTemplate(tpl);
    setTplName(""); setTplIcon("📋"); setTplDeliverables([{ title: "", subtasks: [""] }]);
    setError(""); setTab("use");
  };

  const tabSty = (t) => ({
    flex: 1, padding: "10px 0", textAlign: "center", fontSize: 11, fontWeight: 700,
    letterSpacing: "0.06em", cursor: "pointer", userSelect: "none",
    borderBottom: tab === t ? "2px solid #a78bfa" : "2px solid transparent",
    color: tab === t ? "#a78bfa" : "#6b7280", transition: "all 0.12s",
  });

  return (
    <Overlay onClose={onClose}>
      <ModalShell title="Templates" onClose={onClose} accentColor="#a78bfa" width={600}>
        <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={tabSty("use")} onClick={() => setTab("use")}>USE TEMPLATE</div>
          <div style={tabSty("create")} onClick={() => setTab("create")}>CREATE TEMPLATE</div>
        </div>

        {tab === "use" && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 300, overflowY: "auto" }}>
              {allTemplates.map(tpl => (
                <div key={tpl.id} onClick={() => { setSelected(tpl); if (!name) setName(tpl.name); }} style={{
                  padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                  border: `2px solid ${selected?.id === tpl.id ? "#a78bfa" : "rgba(0,0,0,0.08)"}`,
                  background: selected?.id === tpl.id ? "rgba(167,139,250,0.08)" : "#f7f8fa", transition: "all 0.12s",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{tpl.icon || "📋"}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{tpl.name}</div>
                  <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{(tpl.deliverables||[]).length} deliverables</div>
                  {selected?.id === tpl.id && (
                    <div style={{ marginTop: 6 }}>
                      {(tpl.deliverables||[]).map(d => (
                        <div key={d.title} style={{ fontSize: 10, color: "#374151", marginTop: 2 }}>
                          <span style={{ color: "#a78bfa" }}>▸</span> {d.title}
                          <span style={{ color: "#9ca3af" }}> ({(d.subtasks||[]).length} tasks)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {selected && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><div style={labelStyle}>Project Name</div><input value={name} onChange={e => setName(e.target.value)} style={{ ...selectStyle, width: "100%" }} /></div>
                  <div><div style={labelStyle}>Client</div><input value={client} onChange={e => setClient(e.target.value)} style={{ ...selectStyle, width: "100%", placeholder: "e.g. Acme Corp" }} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><div style={labelStyle}>Start Date</div><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...selectStyle, width: "100%" }} /></div>
                  <div>
                    <div style={labelStyle}>Color</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {PROJECT_COLORS.map(c => <div key={c} onClick={() => setColor(c)} style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: color === c ? "3px solid #fff" : "3px solid transparent", boxShadow: color === c ? `0 0 0 2px ${c}` : "none", flexShrink: 0 }} />)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {error && <div style={{ fontSize: 11, color: "#f87171" }}>{error}</div>}
            <ModalFooter onClose={onClose} onSave={handleCreate} saveLabel="Create Project" color="#a78bfa" />
          </div>
        )}

        {tab === "create" && (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "end" }}>
              <div>
                <div style={labelStyle}>Template Name</div>
                <input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="e.g. Social Campaign"
                  style={{ ...selectStyle, width: "100%", fontSize: 14 }} />
              </div>
              <div>
                <div style={labelStyle}>Icon</div>
                <select value={tplIcon} onChange={e => setTplIcon(e.target.value)} style={{ ...selectStyle, fontSize: 16 }}>
                  {["📋","✉","▶","◧","🚀","📊","🎨","📝","📱","🌐","📣","🎯"].map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 340, overflowY: "auto" }}>
              {tplDeliverables.map((del, di) => (
                <div key={di} style={{ background: "#f7f8fa", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", flexShrink: 0 }} />
                    <input value={del.title} onChange={e => updateDelTitle(di, e.target.value)}
                      placeholder={`Deliverable ${di + 1} (e.g. Email 1)`}
                      style={{ ...selectStyle, flex: 1, fontWeight: 700 }} />
                    <button onClick={() => removeDeliverable(di)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingLeft: 14 }}>
                    {del.subtasks.map((sub, si) => (
                      <div key={si} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#9ca3af", flexShrink: 0 }} />
                        <input value={sub} onChange={e => updateSubtask(di, si, e.target.value)}
                          placeholder={`Step ${si + 1} (e.g. Copy Development)`}
                          style={{ ...selectStyle, flex: 1, fontSize: 11 }} />
                        <button onClick={() => removeSubtask(di, si)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => addSubtask(di)} style={{
                      background: "none", border: "1px dashed rgba(0,0,0,0.15)", borderRadius: 4, color: "#6b7280",
                      padding: "3px 10px", cursor: "pointer", fontSize: 10, fontFamily: "inherit", marginTop: 2, textAlign: "left",
                    }}>+ Add step</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addDeliverable} style={{
              background: "rgba(167,139,250,0.08)", border: "1px dashed rgba(167,139,250,0.4)",
              borderRadius: 7, color: "#a78bfa", padding: "8px", cursor: "pointer",
              fontSize: 11, fontFamily: "inherit", fontWeight: 700,
            }}>+ Add Deliverable</button>
            {error && <div style={{ fontSize: 11, color: "#f87171" }}>{error}</div>}
            <ModalFooter onClose={onClose} onSave={handleSaveTemplate} saveLabel="Save Template" color="#a78bfa" />
          </div>
        )}
      </ModalShell>
    </Overlay>
  );
}

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────
function exportToExcel(projects) {
  if (!window.XLSX) { alert("Excel library not loaded yet."); return; }
  const XLSX = window.XLSX;
  const wb = XLSX.utils.book_new();

  projects.forEach(proj => {
    const inProgress = proj.deliverables.filter(d => d.status !== "Done");
    if (!inProgress.length) return;

    const rows = [["#","Task","Status","Department","Start","End","Duration (days)","Assignees","Dependencies","Progress %"]];
    let rowNum = 1;
    inProgress.forEach(del => {
      rows.push([
        rowNum++, del.title, del.status, del.department || "",
        del.start, del.end, durDays(del.start, del.end),
        del.assignees.join(", "), del.depsText || "", del.progress,
      ]);
      del.subtasks.filter(s => s.status !== "Done").forEach(sub => {
        rows.push([
          rowNum++, "  " + sub.title, sub.status, sub.department || "",
          sub.start, sub.end, durDays(sub.start, sub.end),
          sub.assignees.join(", "), sub.depsText || "", sub.progress,
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [4,25,14,14,12,12,10,20,14,10].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, proj.name.slice(0,31));
  });

  XLSX.writeFile(wb, `project-status-${new Date().toISOString().slice(0,10)}.xlsx`);
}



// --- NEW PROJECT MODAL ────────────────────────────────────────────────────────
function NewProjectModal({ onClose, onAdd, existingColors }) {
  const defaultColor = PROJECT_COLORS.find(c => !existingColors.includes(c)) || PROJECT_COLORS[0];
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [error, setError] = useState("");

  const handleAdd = () => {
    if (!name.trim()) { setError("Project name is required."); return; }
    const id = "proj_" + Date.now();
    onAdd({ id, name: name.trim(), client: client.trim(), color, deliverables: [] });
    onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <ModalShell title="New Project" onClose={onClose} width={420}>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div style={labelStyle}>Client Name</div>
            <input
              value={client}
              onChange={e => setClient(e.target.value)}
              placeholder="e.g. Acme Corp"
              style={{ ...selectStyle, width: "100%", fontSize: 14 }}
            />
          </div>
          <div>
            <div style={labelStyle}>Project Name</div>
            <input
              autoFocus
              value={name}
              onChange={e => { setName(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="e.g. Q4 Email Campaign"
              style={{ ...selectStyle, width: "100%", fontSize: 14 }}
            />
            {error && <div style={{ fontSize: 11, color: "#f87171", marginTop: 5 }}>{error}</div>}
          </div>
          <div>
            <div style={labelStyle}>Color</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PROJECT_COLORS.map(c => (
                <div key={c} onClick={() => setColor(c)} style={{
                  width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                  border: color === c ? `3px solid #fff` : "3px solid transparent",
                  boxShadow: color === c ? `0 0 0 2px ${c}` : "none",
                  transition: "all 0.12s", flexShrink: 0,
                }} />
              ))}
            </div>
          </div>
          {/* Preview pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: color + "12", border: `1px solid ${color}30`, borderRadius: 20, width: "fit-content" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
            <span style={{ fontSize: 12, color, fontWeight: 700 }}>{name || "Project name"}</span>
          </div>
        </div>
        <ModalFooter onClose={onClose} onSave={handleAdd} saveLabel="Create Project" color={color} />
      </ModalShell>
    </Overlay>
  );
}

// --- NEW DELIVERABLE MODAL ────────────────────────────────────────────────────
function NewDeliverableModal({ project, onClose, onAdd, allPeople, savedTemplates = [] }) {
  const today = "2026-05-20";
  const weekOut = "2026-05-27";
  const [form, setForm] = useState({
    title: "", status: "Not Started", priority: "Medium",
    assignees: [], start: today, end: weekOut, progress: 0, dependencies: [], department: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const togglePerson = (id) => set("assignees", form.assignees.includes(id) ? form.assignees.filter(x => x !== id) : [...form.assignees, id]);
  const [error, setError] = useState("");
  const [keepOpen, setKeepOpen] = useState(false);

  const allTemplates = [...(typeof BUILT_IN_TEMPLATES !== "undefined" ? BUILT_IN_TEMPLATES : []), ...(savedTemplates || [])];
  const subtaskTemplates = allTemplates.flatMap(t =>
    (t.deliverables || []).flatMap(d => (d.subtasks || []).length > 0 ? [{ label: `${t.name} — ${d.title}`, subtasks: d.subtasks }] : [])
  );

  const applyTemplate = (tpl) => {
    setForm(f => ({ ...f, title: tpl.label.split(" — ")[1] || f.title }));
    setSelectedSubtaskTemplate(tpl);
  };
  const [selectedSubtaskTemplate, setSelectedSubtaskTemplate] = useState(null);

  const handleAdd = () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    const id = "d_" + Date.now();
    const subtasks = selectedSubtaskTemplate
      ? selectedSubtaskTemplate.subtasks.map((s, i) => ({ ...s, id: "s_" + Date.now() + i }))
      : [];
    onAdd(project.id, { ...form, id, title: form.title.trim(), subtasks });
    if (keepOpen) {
      setForm({ title: "", status: "Not Started", priority: "Medium", assignees: [], start: today, end: weekOut, progress: 0, dependencies: [], department: "" });
      setSelectedSubtaskTemplate(null);
      setError("");
    } else {
      onClose();
    }
  };

  const duration = form.start && form.end ? durDays(form.start, form.end) : "—";

  return (
    <Overlay onClose={onClose}>
      <ModalShell title={<span>New Deliverable <span style={{ color: project.color, fontWeight: 400 }}>— {project.name}</span></span>} onClose={onClose} accentColor={project.color} width={540}>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Template picker */}
          {subtaskTemplates.length > 0 && (
            <div>
              <div style={labelStyle}>Start from template (optional)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <div onClick={() => setSelectedSubtaskTemplate(null)} style={{
                  padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600,
                  border: `1px solid ${!selectedSubtaskTemplate ? project.color : "rgba(0,0,0,0.1)"}`,
                  background: !selectedSubtaskTemplate ? project.color + "15" : "transparent",
                  color: !selectedSubtaskTemplate ? project.color : "#6b7280",
                }}>Blank</div>
                {subtaskTemplates.slice(0, 6).map((tpl, i) => (
                  <div key={i} onClick={() => applyTemplate(tpl)} style={{
                    padding: "4px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600,
                    border: `1px solid ${selectedSubtaskTemplate === tpl ? project.color : "rgba(0,0,0,0.1)"}`,
                    background: selectedSubtaskTemplate === tpl ? project.color + "15" : "transparent",
                    color: selectedSubtaskTemplate === tpl ? project.color : "#6b7280",
                  }}>{tpl.label.split(" — ")[1] || tpl.label}</div>
                ))}
              </div>
              {selectedSubtaskTemplate && (
                <div style={{ marginTop: 6, fontSize: 10, color: "#6b7280" }}>
                  Includes {selectedSubtaskTemplate.subtasks.length} subtasks: {selectedSubtaskTemplate.subtasks.map(s => s.title).join(", ")}
                </div>
              )}
            </div>
          )}
          <div>
            <div style={labelStyle}>Deliverable Title</div>
            <input autoFocus value={form.title} onChange={e => { set("title", e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="e.g. Email 6 — Loyalty Offer"
              style={{ ...selectStyle, width: "100%", fontSize: 13 }} />
            {error && <div style={{ fontSize: 11, color: "#f87171", marginTop: 5 }}>{error}</div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["Status","status",STATUSES],["Priority","priority",PRIORITIES]].map(([lbl,key,opts]) => (
              <div key={key}>
                <div style={labelStyle}>{lbl}</div>
                <select value={form[key]} onChange={e => set(key, e.target.value)} style={selectStyle}>{opts.map(o => <option key={o}>{o}</option>)}</select>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={labelStyle}>Department</div>
              <select value={form.department || ""} onChange={e => set("department", e.target.value)} style={selectStyle}>
                <option value="">— None —</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            {form.department && <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}><DeptBadge dept={form.department} /></div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.55fr", gap: 12 }}>
            {[["Start","start"],["End","end"]].map(([lbl,key]) => (
              <div key={key}>
                <div style={labelStyle}>{lbl}</div>
                <input type="date" value={form[key]} onChange={e => set(key, e.target.value)} style={{ ...selectStyle, width: "100%" }} />
              </div>
            ))}
            <div>
              <div style={labelStyle}>Duration</div>
              <div style={{ ...selectStyle, background: "rgba(0,0,0,0.04)", color: "#6b7280", display: "flex", alignItems: "center" }}>{duration}{typeof duration === "number" ? "d" : ""}</div>
            </div>
          </div>
          <div>
            <div style={labelStyle}>Assignees</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {allPeople.map(p => (
                <div key={p.id} onClick={() => togglePerson(p.id)} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 20, cursor: "pointer",
                  border: `1.5px solid ${form.assignees.includes(p.id) ? p.color : "rgba(0,0,0,0.06)"}`,
                  background: form.assignees.includes(p.id) ? p.color + "18" : "transparent",
                  transition: "all 0.12s", userSelect: "none",
                }}>
                  <Avatar person={p} size={18} /><span style={{ fontSize: 11, color: "#374151", fontWeight: 500 }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: fs(11), color: "#6b7280", cursor: "pointer" }}>
            <input type="checkbox" checked={keepOpen} onChange={e => setKeepOpen(e.target.checked)} />
            Add another
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button onClick={handleAdd} style={{ ...cancelBtnStyle, background: project.color, color: "#000", border: "none", fontWeight: 800 }}>Add Deliverable</button>
          </div>
        </div>
      </ModalShell>
    </Overlay>
  );
}

// --- NEW SUBTASK MODAL ────────────────────────────────────────────────────────
function NewSubtaskModal({ project, deliverable, onClose, onAdd, allPeople }) {
  const [form, setForm] = useState({
    title: "", status: "Not Started", priority: "Medium",
    assignees: [], start: deliverable.start, end: deliverable.end, progress: 0, dependencies: [], department: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const togglePerson = (id) => set("assignees", form.assignees.includes(id) ? form.assignees.filter(x => x !== id) : [...form.assignees, id]);
  const [error, setError] = useState("");

  const [keepOpen, setKeepOpen] = useState(false);
  const handleAdd = () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    const id = "s_" + Date.now();
    onAdd(project.id, deliverable.id, { ...form, id, title: form.title.trim() });
    if (keepOpen) {
      setForm({ title: "", status: "Not Started", priority: "Medium", assignees: form.assignees, start: form.start, end: form.end, progress: 0, dependencies: [], department: form.department });
      setError("");
    } else {
      onClose();
    }
  };

  return (
    <Overlay onClose={onClose}>
      <ModalShell title={<span>New Subtask <span style={{ color: project.color, fontWeight: 400 }}>— {deliverable.title}</span></span>} onClose={onClose} accentColor={project.color} width={520}>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={labelStyle}>Subtask Title</div>
            <input autoFocus value={form.title} onChange={e => { set("title", e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder="e.g. Copy development"
              style={{ ...selectStyle, width: "100%", fontSize: 13 }} />
            {error && <div style={{ fontSize: 11, color: "#f87171", marginTop: 5 }}>{error}</div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["Status","status",STATUSES],["Priority","priority",PRIORITIES]].map(([lbl,key,opts]) => (
              <div key={key}>
                <div style={labelStyle}>{lbl}</div>
                <select value={form[key]} onChange={e => set(key, e.target.value)} style={selectStyle}>{opts.map(o => <option key={o}>{o}</option>)}</select>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={labelStyle}>Department</div>
              <select value={form.department || ""} onChange={e => set("department", e.target.value)} style={selectStyle}>
                <option value="">— None —</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            {form.department && <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}><DeptBadge dept={form.department} /></div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["Start","start"],["End","end"]].map(([lbl,key]) => (
              <div key={key}>
                <div style={labelStyle}>{lbl}</div>
                <input type="date" value={form[key]} onChange={e => set(key, e.target.value)} style={{ ...selectStyle, width: "100%" }} />
              </div>
            ))}
          </div>
          <div>
            <div style={labelStyle}>Assignees</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {allPeople.map(p => (
                <div key={p.id} onClick={() => togglePerson(p.id)} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 20, cursor: "pointer",
                  border: `1.5px solid ${form.assignees.includes(p.id) ? p.color : "rgba(0,0,0,0.06)"}`,
                  background: form.assignees.includes(p.id) ? p.color + "18" : "transparent",
                  transition: "all 0.12s", userSelect: "none",
                }}>
                  <Avatar person={p} size={18} /><span style={{ fontSize: 11, color: "#374151", fontWeight: 500 }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: fs(11), color: "#6b7280", cursor: "pointer" }}>
            <input type="checkbox" checked={keepOpen} onChange={e => setKeepOpen(e.target.checked)} />
            Add another
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button onClick={handleAdd} style={{ ...cancelBtnStyle, background: project.color, color: "#000", border: "none", fontWeight: 800 }}>Add Subtask</button>
          </div>
        </div>
      </ModalShell>
    </Overlay>
  );
}

// --- SHARED MODAL PRIMITIVES ──────────────────────────────────────────────────
function Overlay({ children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)", overflowY: "auto", padding: "40px 16px" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      {children}
    </div>
  );
}
function ModalShell({ title, onClose, children, accentColor = BRAND_TEAL, width = 480 }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 12, width, maxHeight: "92vh", overflow: "auto", boxShadow: "0 30px 90px rgba(0,0,0,0.35)" }}>
      <div style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 4, height: 20, background: accentColor, borderRadius: 2, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#111827" }}>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "0 2px" }}>×</button>
      </div>
      {children}
    </div>
  );
}
function ModalFooter({ onClose, onSave, saveLabel, color }) {
  return (
    <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", padding: "14px 20px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
      <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
      <button onClick={onSave} style={{ ...cancelBtnStyle, background: color, color: "#000", border: "none", fontWeight: 800 }}>{saveLabel}</button>
    </div>
  );
}

// --- APP ──────────────────────────────────────────────────────────────────────
// ─── COPY/PASTE HELPERS ──────────────────────────────────────────────────────
// Deep-clone a subtask with fresh IDs so the paste is independent
function cloneSubtask(sub) {
  return { ...sub, id: "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6) };
}
// Deep-clone a deliverable + all its subtasks with fresh IDs
function cloneDeliverable(del) {
  const newId = "d_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  return {
    ...del,
    id: newId,
    title: del.title + " (copy)",
    dependencies: [], // don't carry over cross-deliverable deps
    subtasks: del.subtasks.map(s => cloneSubtask({ ...s, dependencies: [] })),
  };
}

// ─── SHAPE CONVERTERS — module-level pure functions (no env dependency) ──────
function rowToSubtask(r) {
  return {
    id: r.id, title: r.title, status: r.status, priority: r.priority,
    department: r.department || "", start: r.start_date || "", end: r.end_date || "",
    progress: r.progress ?? 0, dependencies: r.dependencies ?? [], assignees: r.assignees ?? [],
    effort: r.effort || "M",
    file_url: r.file_url || "",
  };
}
function rowToDeliverable(r, subs) {
  return {
    id: r.id, title: r.title, status: r.status, priority: r.priority,
    department: r.department || "", start: r.start_date || "", end: r.end_date || "",
    progress: r.progress ?? 0, dependencies: r.dependencies ?? [], assignees: r.assignees ?? [],
    trackOverride: r.track_override || null,
    effort: r.effort || "M",
    file_url: r.file_url || "",
    subtasks: (subs || []).filter(s => s.deliverable_id != null && s.deliverable_id === r.id)
      .sort((a, b) => a.position - b.position).map(rowToSubtask),
  };
}
function rowToProject(r, dels, subs) {
  return {
    id: r.id, name: r.name, client: r.client || "", color: r.color,
    archived: r.archived, archivedAt: r.archived_at || null,
    ownerId: r.owner_id || null,
    teamMemberIds: r.team_member_ids || [],
    notes: r.notes || "",
    meta: r.meta || {},
    deliverables: (dels || []).filter(d => d.project_id === r.id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(d => rowToDeliverable(d, subs)),
  };
}
function delToRow(d, projectId, pos = 0) {
  return {
    id: d.id, project_id: projectId, title: d.title, status: d.status, priority: d.priority,
    department: d.department || null, start_date: d.start || null, end_date: d.end || null,
    progress: d.progress ?? 0, dependencies: d.dependencies ?? [], assignees: d.assignees ?? [],
    track_override: d.trackOverride || null, effort: d.effort || "M", file_url: d.file_url || null, position: pos,
  };
}
function subToRow(s, delId, projId, pos = 0) {
  return {
    id: s.id, deliverable_id: delId, project_id: projId, title: s.title,
    status: s.status, priority: s.priority, department: s.department || null,
    start_date: s.start || null, end_date: s.end || null,
    progress: s.progress ?? 0, dependencies: s.dependencies ?? [], assignees: s.assignees ?? [],
    effort: s.effort || "M", file_url: s.file_url || null, position: pos,
  };
}

function ptoToRow(p) {
  return {
    id: p.id, person_id: p.personId, start_date: p.start,
    end_date: p.end, note: p.note || "",
  };
}
function rowToPto(r) {
  return { id: r.id, personId: r.person_id, start: r.start_date, end: r.end_date, note: r.note || "" };
}

// ── PTO HELPERS ──────────────────────────────────────────────────────────────
function isOnPto(personId, dateStr, ptoList) {
  return ptoList.some(p => p.personId === personId && dateStr >= p.start && dateStr <= p.end);
}
function ptoOverlap(personId, startStr, endStr, ptoList) {
  return ptoList.filter(p => p.personId === personId && p.start <= endStr && p.end >= startStr);
}

export default function App() {
  // ── SUPABASE CONFIG — read after main.jsx has set window vars ────────────
  // Reading inside App() guarantees main.jsx has already run and set these.
  const SB_URL   = (typeof window !== "undefined" && window.__SB_URL__)  || "";
  const SB_KEY   = (typeof window !== "undefined" && window.__SB_KEY__)  || "";
  const SB_READY = !!(SB_URL && SB_KEY);

  // Debug: log on every mount so you can confirm env vars are present
  useEffect(() => {
    console.log("[PulseX] App mounted");
    console.log("[PulseX] SB_URL:", SB_URL ? SB_URL.slice(0, 40) + "..." : "NOT SET — check main.jsx / .env.local");
    console.log("[PulseX] SB_KEY:", SB_KEY ? SB_KEY.slice(0, 8) + "..." : "NOT SET — check main.jsx / .env.local");
    console.log("[PulseX] SB_READY:", SB_READY);
  }, []); // eslint-disable-line

  // ── Supabase fetch helper — closes over in-App SB_URL / SB_KEY ───────────
  const sbFetch = useCallback(async (path, opts = {}) => {
    if (!SB_READY) {
      return { data: null, error: "Supabase not configured" };
    }
    const { headers: extraHeaders, prefer, ...restOpts } = opts;
    const url = `${SB_URL}/rest/v1/${path}`;
    console.debug("[PulseX]", opts.method || "GET", path.split("?")[0]);
    try {
      const res = await fetch(url, {
        ...restOpts,
        headers: {
          "apikey":        SB_KEY,
          "Authorization": `Bearer ${SB_KEY}`,
          "Content-Type":  "application/json",
          "Prefer":        prefer || "return=representation",
          ...(extraHeaders || {}),
        },
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("[PulseX] HTTP", res.status, path.split("?")[0], "→", text.slice(0, 200));
        return { data: null, error: text };
      }
      const text = await res.text();
      return { data: text ? JSON.parse(text) : null, error: null };
    } catch (e) {
      console.error("[PulseX] fetch threw:", e.message, "→", path.split("?")[0]);
      return { data: null, error: e.message };
    }
  }, [SB_URL, SB_KEY, SB_READY]); // re-creates if env vars somehow change

  // ── sb convenience object — re-created when sbFetch updates ──────────────
  const sb = useMemo(() => ({
    select:      (table, query = "")     => sbFetch(query ? `${table}?${query}` : table),
    upsert:      (table, body)           => sbFetch(table, { method: "POST",   prefer: "resolution=merge-duplicates,return=minimal", body: JSON.stringify(Array.isArray(body) ? body : [body]) }),
    update:      (table, id, body)       => sbFetch(`${table}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH",  prefer: "return=minimal", body: JSON.stringify(body) }),
    updateWhere: (table, col, val, body) => sbFetch(`${table}?${col}=eq.${encodeURIComponent(val)}`, { method: "PATCH",  prefer: "return=minimal", body: JSON.stringify(body) }),
    delete:      (table, id)             => sbFetch(`${table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" }),
    deleteWhere: (table, col, val)       => sbFetch(`${table}?${col}=eq.${encodeURIComponent(val)}`, { method: "DELETE", prefer: "return=minimal" }),
  }), [sbFetch]);

  // ── UI-only state (never persisted) ───────────────────────────────────────
  const [view, setView] = useState("timeline");
  const [editingItem, setEditingItem] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [projectMenu, setProjectMenu] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState(null);
  const [newSubtask, setNewSubtask] = useState(null);
  const [projectDetailsId, setProjectDetailsId] = useState(null); // project id for details modal
  // Clipboard for copy/paste on timeline

  // ── PTO & current user ──────────────────────────────────────────────────
  const [pto, setPto] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(() => {
    try { return localStorage.getItem("planr_current_user") || ""; } catch { return ""; }
  });
  const setCurrentUser = (id) => {
    setCurrentUserId(id);
    try { localStorage.setItem("planr_current_user", id); } catch {}
  };
  const [clipboard, setClipboard] = useState(null); // { type: "subtask"|"deliverable", data }
  const [zoomId, setZoomId] = useState(() => {
    try { return localStorage.getItem("planr_zoom") || "standard"; } catch { return "standard"; }
  });
  const zoomLevel = ZOOM_LEVELS.find(z => z.id === zoomId) ?? ZOOM_LEVELS[1];
  const zoomBase  = zoomLevel.base;
  const zoomScale = zoomLevel.scale;
  _zoomRatio = zoomScale; // update module-level ratio used by fs()
  const setZoom = (id) => {
    setZoomId(id);
    try { localStorage.setItem("planr_zoom", id); } catch {}
  };


  // ── Data state ────────────────────────────────────────────────────────────
  const [projects, setProjects] = useState([]);

  const [archivedProjects, setArchivedProjects] = useState([]);
  const [people, setPeople] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [statusNotes, setStatusNotes] = useState({});
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const seeded = useRef(false);

  // ── Load all data ─────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!SB_READY) {
      // Not a Vite/Supabase environment (e.g. Claude artifact preview) — use in-memory defaults
      setProjects(initialProjects);
      setPeople(initialPeople);
      setLoading(false);
      return;
    }
    console.log("[PulseX] loadAll — URL:", SB_URL ? "set" : "MISSING");
    setDbError(null);
    try {
      const [pR, dR, sR, mR, hR, nR, tR, ptR] = await Promise.all([
        sb.select("projects",     "order=position.asc,created_at.asc"),
        sb.select("deliverables", "order=position.asc,created_at.asc"),
        sb.select("subtasks",     "order=position.asc,created_at.asc"),
        sb.select("team_members", "order=position.asc,created_at.asc"),
        sb.select("holidays",     "order=date.asc"),
        sb.select("status_notes", ""),
        sb.select("templates",    "order=created_at.asc"),
        sb.select("pto",          "order=start_date.asc"),
      ]);
      for (const r of [pR, dR, sR, mR, hR, nR, tR, ptR]) {
        if (r.error) throw new Error(r.error);
      }
      // Seed if empty
      if (!seeded.current && (!pR.data || pR.data.length === 0)) {
        console.log("[PulseX] DB empty — seeding defaults");
        seeded.current = true;
        await seedDefaults();
        return loadAll();
      }
      seeded.current = true;
      console.log("[PulseX] Loaded — projects:", pR.data?.length, "deliverables:", dR.data?.length, "subtasks:", sR.data?.length);
      const active   = (pR.data || []).filter(p => !p.archived);
      const archived = (pR.data || []).filter(p => p.archived);
      setProjects(active.map(p => rowToProject(p, dR.data, sR.data)));
      setArchivedProjects(archived.map(p => rowToProject(p, dR.data, sR.data)));
      setPeople((mR.data || []).map(p => ({ id: p.id, name: p.name, color: p.color })));
      setHolidays((hR.data || []).map(h => ({ id: h.id, date: h.date, name: h.name })));
      const notes = {};
      (nR.data || []).forEach(n => { notes[`${n.project_id}::${n.deliverable_id}`] = n.note; });
      setStatusNotes(notes);
      setSavedTemplates((tR.data || []).map(t => ({ ...t.data, id: t.id, name: t.name })));
      setPto((ptR.data || []).map(rowToPto));
    } catch (e) {
      console.error("[PulseX] loadAll failed:", e.message);
      setDbError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sb, SB_READY]); // sb changes when sbFetch changes (env vars set)

  useEffect(() => { loadAll(); }, [loadAll]);

  async function seedDefaults() {
    for (let i = 0; i < initialPeople.length; i++) {
      await sb.upsert("team_members", { id: initialPeople[i].id, name: initialPeople[i].name, color: initialPeople[i].color, position: i });
    }
    for (let pi = 0; pi < initialProjects.length; pi++) {
      const proj = initialProjects[pi];
      await sb.upsert("projects", { id: proj.id, name: proj.name, client: proj.client || "", color: proj.color, archived: false, position: pi });
      for (let di = 0; di < proj.deliverables.length; di++) {
        const del = proj.deliverables[di];
        await sb.upsert("deliverables", delToRow(del, proj.id, di));
        for (let si = 0; si < del.subtasks.length; si++) {
          await sb.upsert("subtasks", subToRow(del.subtasks[si], del.id, proj.id, si));
        }
      }
    }
  }

  // Optimistic helper: update local state immediately, persist to DB, reload on error
  async function optimistic(setFn, dbFn, label = "") {
    setFn(); // instant UI update
    if (!SB_READY) return; // no Supabase configured — keep in-memory state as-is
    const err = await dbFn();
    if (err) {
      console.error("[PulseX] write failed" + (label ? ` (${label})` : "") + ":", err);
      loadAll(); // revert to DB truth on failure
    }
  }

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleEditItem = (item) => setEditingItem(item);

  const handleSaveItem = (updated) => {
    // Log dependency changes explicitly
    if (updated.dependencies) {
      console.log("[PulseX] saveItem — id:", updated.id, "deps:", updated.dependencies);
    }
    // Date cascade logic (unchanged)
    const doSave = (projs) => {
      const original = projs.flatMap(p => [...p.deliverables, ...p.deliverables.flatMap(d => d.subtasks)]).find(x => x.id === updated.id);
      const holidaySet = new Set(holidays.map(h => h.date));
      const nextWorkDay = (dateStr) => {
        if (!dateStr) return dateStr;
        let d = new Date(dateStr + "T00:00:00");
        while (d.getDay() === 0 || d.getDay() === 6 || holidaySet.has(d.toISOString().slice(0,10))) d = new Date(d.getTime() + 86400000);
        return d.toISOString().slice(0,10);
      };
      const sanitized = { ...updated, start: nextWorkDay(updated.start), end: nextWorkDay(updated.end) };
      let newProjs = projs.map(proj => {
        if (proj.id !== sanitized.projectId) return proj;
        return { ...proj, deliverables: proj.deliverables.map(del => {
          if (del.id === sanitized.id) return { ...del, ...sanitized };
          return { ...del, subtasks: del.subtasks.map(s => s.id === sanitized.id ? { ...s, ...sanitized } : s) };
        })};
      });
      if (original && original.end !== sanitized.end) newProjs = cascadeDates(newProjs, sanitized.id, sanitized.end, holidays);
      const newDeps = sanitized.dependencies || [], oldDeps = original ? (original.dependencies || []) : [];
      const addedDeps = newDeps.filter(d => !oldDeps.includes(d));
      if (addedDeps.length > 0) {
        const allItems = newProjs.flatMap(p => [...p.deliverables, ...p.deliverables.flatMap(d => d.subtasks)]);
        const predEnds = addedDeps.map(id => allItems.find(x => x.id === id)).filter(Boolean).map(x => x.end);
        if (predEnds.length > 0) {
          const latestPred = predEnds.sort().pop();
          let ns = new Date(new Date(parseDate(latestPred).getTime() + 86400000).toISOString().slice(0,10) + "T00:00:00");
          while (ns.getDay() === 0 || ns.getDay() === 6 || holidaySet.has(ns.toISOString().slice(0,10))) ns = new Date(ns.getTime() + 86400000);
          const newStart = ns.toISOString().slice(0,10);
          // Only push forward — never move a task backward
          if (newStart <= sanitized.start) {
            // dependency already satisfied, no date change needed
          } else {
          const dur = Math.max(1, durDays(sanitized.start, sanitized.end));
          let ne = new Date(ns.getTime()); let added = 0;
          while (added < dur - 1) { ne = new Date(ne.getTime() + 86400000); if (ne.getDay() !== 0 && ne.getDay() !== 6 && !holidaySet.has(ne.toISOString().slice(0,10))) added++; }
          const newEnd = ne.toISOString().slice(0,10);
          if (newStart !== sanitized.start || newEnd !== sanitized.end) {
            newProjs = newProjs.map(proj => { if (proj.id !== sanitized.projectId) return proj;
              return { ...proj, deliverables: proj.deliverables.map(del => { if (del.id === sanitized.id) return { ...del, start: newStart, end: newEnd };
                return { ...del, subtasks: del.subtasks.map(s => s.id === sanitized.id ? { ...s, start: newStart, end: newEnd } : s) }; }) }; });
            newProjs = cascadeDates(newProjs, sanitized.id, newEnd, holidays);
          }
          } // end forward-only guard
        }
      }
      return newProjs;
    };

    optimistic(
      () => setProjects(ps => doSave(ps)),
      async () => {
        const newProjs = doSave(projects);
        const item = newProjs.flatMap(p => [...p.deliverables, ...p.deliverables.flatMap(d => d.subtasks)]).find(x => x.id === updated.id);
        if (!item) return null;
        // Determine true item type: check if it exists as a subtask in the DB model
        // This prevents subtasks from being accidentally saved as deliverables
        const proj = newProjs.find(p => p.id === updated.projectId);
        const parentDel = proj?.deliverables.find(d => d.subtasks.some(s => s.id === updated.id));
        const isActuallySubtask = !!(parentDel || updated.deliverableId);
        const actualDelId = parentDel?.id || updated.deliverableId;

        if (isActuallySubtask && actualDelId) {
          const del = proj?.deliverables.find(d => d.id === actualDelId);
          const pos = del?.subtasks.findIndex(s => s.id === updated.id) ?? 0;
          const { error } = await sb.upsert("subtasks", subToRow(item, actualDelId, updated.projectId, pos));
          return error;
        } else {
          const pos = proj?.deliverables.findIndex(d => d.id === updated.id) ?? 0;
          const { error } = await sb.upsert("deliverables", delToRow(item, updated.projectId, pos));
          return error;
        }
      }
    );
  };

  const handleAddProject = (proj) => optimistic(
    () => setProjects(ps => [...ps, { ...proj, deliverables: [] }]),
    async () => {
      const { error } = await sb.upsert("projects", { id: proj.id, name: proj.name, client: proj.client || "", color: proj.color, archived: false, position: projects.length });
      return error;
    }
  );

  const handleArchiveProject = (id) => {
    const proj = projects.find(p => p.id === id);
    if (!proj) return;
    const archived_at = new Date().toISOString();
    optimistic(
      () => { setProjects(ps => ps.filter(p => p.id !== id)); setArchivedProjects(a => [...a, { ...proj, archivedAt: archived_at }]); },
      async () => { const { error } = await sb.update("projects", id, { archived: true, archived_at }); return error; }
    );
  };

  const handleRestoreProject = (id) => {
    const proj = archivedProjects.find(p => p.id === id);
    if (!proj) return;
    const { archivedAt, ...rest } = proj;
    optimistic(
      () => { setArchivedProjects(a => a.filter(p => p.id !== id)); setProjects(ps => [...ps, { ...rest, archived: false }]); },
      async () => { const { error } = await sb.update("projects", id, { archived: false, archived_at: null }); return error; }
    );
  };

  const handleDeleteProject = (id) => optimistic(
    () => { setProjects(ps => ps.filter(p => p.id !== id)); setArchivedProjects(a => a.filter(p => p.id !== id)); },
    async () => { const { error } = await sb.delete("projects", id); return error; }
  );

  const handleSaveProjectDetails = (proj) => optimistic(
    () => setProjects(projs => projs.map(p => p.id === proj.id ? { ...p, ...proj } : p)),
    async () => {
      const { error } = await sb.update("projects", proj.id, {
        owner_id:         proj.ownerId || null,
        name:             proj.name,
        client:           proj.client || "",
        team_member_ids:  proj.teamMemberIds || [],
        notes:            proj.notes || "",
        meta:             proj.meta || {},
      });
      return error;
    },
    "saveProjectDetails"
  );

  const handleSaveProject = (proj) => optimistic(
    () => setProjects(projs => projs.map(p => p.id === proj.id ? { ...p, ...proj } : p)),
    async () => {
      const { error } = await sb.update("projects", proj.id, {
        owner_id: proj.ownerId || null,
        name: proj.name,
        client: proj.client || "",
      });
      return error;
    },
    "saveProject"
  );

  const handleRenameProject = (id, name, client) => optimistic(
    () => setProjects(ps => ps.map(p => p.id !== id ? p : { ...p, name, client })),
    async () => { const { error } = await sb.update("projects", id, { name, client }); return error; }
  );

  const handleSaveAsTemplate = (proj) => {
    const tpl = { id: "tpl_saved_" + Date.now(), name: proj.name + " (template)", icon: "📋", deliverables: proj.deliverables.map(d => ({ title: d.title, subtasks: d.subtasks.map(s => s.title) })) };
    setSavedTemplates(t => [...t, tpl]);
    sb.upsert("templates", { id: tpl.id, name: tpl.name, data: tpl });
    alert(`"${proj.name}" saved as a template!`);
  };

  const savePto = async (ptoEntry) => {
    const entry = { ...ptoEntry, id: ptoEntry.id || ("pto_" + Date.now()) };
    setPto(prev => [...prev.filter(p => p.id !== entry.id), entry]);
    if (SB_READY) {
      const { error } = await sb.upsert("pto", ptoToRow(entry));
      if (error) { console.error("[PulseX] savePto:", error); loadAll(); }
    }
  };

  const deletePto = async (id) => {
    setPto(prev => prev.filter(p => p.id !== id));
    if (SB_READY) {
      const { error } = await sb.delete("pto", id);
      if (error) { console.error("[PulseX] deletePto:", error); loadAll(); }
    }
  };

  const handleAddDeliverable = (projectId, del) => optimistic(
    () => setProjects(projs => projs.map(p => p.id !== projectId ? p : { ...p, deliverables: [...p.deliverables, del] })),
    async () => {
      const pos = projects.find(p => p.id === projectId)?.deliverables.length ?? 0;
      const { error } = await sb.upsert("deliverables", delToRow(del, projectId, pos));
      if (error) return error;
      for (let i = 0; i < (del.subtasks || []).length; i++) {
        const { error: se } = await sb.upsert("subtasks", subToRow(del.subtasks[i], del.id, projectId, i));
        if (se) return se;
      }
      return null;
    }
  );

  const handleAddSubtask = (projectId, deliverableId, sub) => optimistic(
    () => setProjects(projs => projs.map(p => p.id !== projectId ? p : { ...p, deliverables: p.deliverables.map(d => d.id !== deliverableId ? d : { ...d, subtasks: [...d.subtasks, sub] }) })),
    async () => {
      const del = projects.find(p => p.id === projectId)?.deliverables.find(d => d.id === deliverableId);
      const pos = del?.subtasks.length ?? 0;
      const { error } = await sb.upsert("subtasks", subToRow(sub, deliverableId, projectId, pos));
      return error;
    }
  );

  const handleDeleteDeliverable = (projectId, deliverableId) => optimistic(
    () => setProjects(projs => projs.map(p => p.id !== projectId ? p : { ...p, deliverables: p.deliverables.filter(d => d.id !== deliverableId) })),
    async () => { const { error } = await sb.delete("deliverables", deliverableId); return error; }
  );

  const handleDeleteSubtask = (projectId, deliverableId, subtaskId) => optimistic(
    () => setProjects(projs => projs.map(p => p.id !== projectId ? p : { ...p, deliverables: p.deliverables.map(d => d.id !== deliverableId ? d : { ...d, subtasks: d.subtasks.filter(s => s.id !== subtaskId) }) })),
    async () => { const { error } = await sb.delete("subtasks", subtaskId); return error; }
  );

  // ── Copy/Paste handlers ──────────────────────────────────────────────────
  const handleCopySubtask = (sub) => {
    setClipboard({ type: "subtask", data: sub });
    console.log("[PulseX] Copied subtask:", sub.title);
  };

  const handleCopyDeliverable = (del) => {
    setClipboard({ type: "deliverable", data: del });
    console.log("[PulseX] Copied deliverable:", del.title, "with", del.subtasks?.length, "subtasks");
  };

  const handlePasteSubtask = (projectId, deliverableId, afterSubtaskId = null) => {
    if (!clipboard || clipboard.type !== "subtask") return;
    const newSub = cloneSubtask(clipboard.data);
    handleInsertSubtask(projectId, deliverableId, afterSubtaskId, newSub);
    console.log("[PulseX] Pasted subtask:", newSub.title);
  };

  const handlePasteDeliverable = (projectId) => {
    if (!clipboard || clipboard.type !== "deliverable") return;
    const newDel = cloneDeliverable(clipboard.data);
    handleAddDeliverable(projectId, newDel);
    console.log("[PulseX] Pasted deliverable:", newDel.title);
  };

  const handleInsertSubtask = (projectId, deliverableId, afterSubtaskId, newSub) => optimistic(
    () => setProjects(projs => projs.map(p => p.id !== projectId ? p : { ...p, deliverables: p.deliverables.map(d => {
      if (d.id !== deliverableId) return d;
      const idx = afterSubtaskId ? d.subtasks.findIndex(s => s.id === afterSubtaskId) : -1;
      const updated = [...d.subtasks]; updated.splice(idx + 1, 0, newSub);
      return { ...d, subtasks: updated };
    }) })),
    async () => {
      const { error } = await sb.upsert("subtasks", subToRow(newSub, deliverableId, projectId, 0));
      if (error) return error;
      // Re-index positions
      const del = projects.find(p => p.id === projectId)?.deliverables.find(d => d.id === deliverableId);
      if (!del) return null;
      const reordered = [...del.subtasks];
      const afterIdx = afterSubtaskId ? reordered.findIndex(s => s.id === afterSubtaskId) : -1;
      reordered.splice(afterIdx + 1, 0, newSub);
      await Promise.all(reordered.map((s, i) => sb.update("subtasks", s.id, { position: i })));
      return null;
    }
  );

  const handleReorderSubtasks = (projectId, deliverableId, newOrder) => optimistic(
    () => setProjects(projs => projs.map(p => p.id !== projectId ? p : { ...p, deliverables: p.deliverables.map(d => d.id !== deliverableId ? d : { ...d, subtasks: newOrder }) })),
    async () => {
      await Promise.all(newOrder.map((s, i) => sb.update("subtasks", s.id, { position: i })));
      return null;
    }
  );



  const handleMarkDone = (projectId, deliverableId, subtaskId) => {
    const proj = projects.find(p => p.id === projectId);
    const del = proj?.deliverables.find(d => d.id === deliverableId);
    if (subtaskId) {
      const sub = del?.subtasks.find(s => s.id === subtaskId);
      const next = sub?.status === "Done" ? "In Progress" : "Done";
      const newProg = next === "Done" ? 100 : 0;
      optimistic(
        () => setProjects(ps => ps.map(p => p.id !== projectId ? p : { ...p, deliverables: p.deliverables.map(d => d.id !== deliverableId ? d : { ...d, subtasks: d.subtasks.map(s => s.id !== subtaskId ? s : { ...s, status: next, progress: newProg }) }) })),
        async () => { const { error } = await sb.update("subtasks", subtaskId, { status: next, progress: newProg }); return error; }
      );
    } else {
      const next = del?.status === "Done" ? "In Progress" : "Done";
      const newProg = next === "Done" ? 100 : del?.progress ?? 0;
      optimistic(
        () => setProjects(ps => ps.map(p => p.id !== projectId ? p : { ...p, deliverables: p.deliverables.map(d => d.id !== deliverableId ? d : { ...d, status: next, progress: newProg, subtasks: next === "Done" ? d.subtasks.map(s => ({ ...s, status: "Done", progress: 100 })) : d.subtasks }) })),
        async () => {
          const { error } = await sb.update("deliverables", deliverableId, { status: next, progress: newProg });
          if (error) return error;
          if (next === "Done") { const { error: se } = await sb.updateWhere("subtasks", "deliverable_id", deliverableId, { status: "Done", progress: 100 }); return se; }
          return null;
        }
      );
    }
  };

  const handleUpdateNote = (key, text) => {
    const [projectId, deliverableId] = key.split("::");
    optimistic(
      () => setStatusNotes(n => ({ ...n, [key]: text })),
      async () => {
        const { data } = await sb.select("status_notes", `project_id=eq.${projectId}&deliverable_id=eq.${deliverableId}&select=id`);
        if (data && data.length > 0) {
          const { error } = await sb.update("status_notes", data[0].id, { note: text });
          return error;
        } else {
          const { error } = await sb.upsert("status_notes", { project_id: projectId, deliverable_id: deliverableId, note: text });
          return error;
        }
      }
    );
  };

  const getSiblingItems = (item) => {
    if (!item) return [];
    const proj = projects.find(p => p.id === item.projectId);
    if (!proj) return [];
    if (item.deliverableId) {
      const del = proj.deliverables.find(d => d.id === item.deliverableId);
      return del ? del.subtasks.filter(s => s.id !== item.id) : [];
    }
    return proj.deliverables.filter(d => d.id !== item.id);
  };

  const navItems = [
    { id: "myhub",     label: "My Hub",    icon: "⊙" },
    { id: "dashboard", label: "Dashboard", icon: "◈" },
    { id: "timeline",  label: "Timeline",  icon: "▬" },
    { id: "people",    label: "By Person", icon: "◎" },
    { id: "status",    label: "Status",    icon: "◉" },
    { id: "workload",  label: "Workload",  icon: "▦" },
    { id: "archived",  label: "Archive",   icon: "⊡" },
  ];

  // Loading / error screens
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f5f6f8", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: '"Roboto", Arial, sans-serif' }}>
      <div style={{ width: 44, height: 44, background: BRAND_TEAL, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: BRAND_NAVY }}>X</div>
      <div style={{ fontSize: fs(13), color: "#6b7280" }}>Loading your workspace…</div>
    </div>
  );

  if (dbError) return (
    <div style={{ minHeight: "100vh", background: "#f5f6f8", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, fontFamily: '"Roboto", Arial, sans-serif' }}>
      <div style={{ fontSize: 14, color: "#f87171", fontWeight: 700 }}>Could not connect to Supabase</div>
      <div style={{ fontSize: 12, color: "#9ca3af", maxWidth: 400, textAlign: "center" }}>{dbError}</div>
      <button onClick={loadAll} style={{ background: BRAND_TEAL, border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontWeight: 700, fontSize: 13, color: BRAND_NAVY }}>Retry</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6f8", color: "#111827", fontFamily: '"Roboto", Arial, sans-serif', display: "flex", flexDirection: "column", maxWidth: "100vw", overflowX: "hidden" }}>

      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet" />
      <style>{`
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: 100%; max-width: 100%; overflow-x: hidden; }
        #root { width: 100%; }
        @media (max-width: 640px) {
          .nav-label { display: none; }
          .dash-sidebar { width: 100% !important; }
        }
        @media (max-width: 480px) {
          header { padding: 0 8px !important; }
          main { padding: 8px !important; gap: 10px !important; }
        }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #e8eaee; }
        ::-webkit-scrollbar-thumb { background: #c4c9d4; border-radius: 3px; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0); cursor: pointer; }
        input[type=range] { cursor: pointer; }
        nav::-webkit-scrollbar { display: none; }
        select option { background: #ffffff; color: #1a1d23; }
        [data-timeline-body] { cursor: default; }
        [data-timeline-body]:not(:has(input:focus)):not(:has(textarea:focus)) { cursor: grab; }
        [data-timeline-body][data-panning] { cursor: grabbing !important; }
        .add-btn:hover { opacity: 1 !important; }
      `}</style>

      {/* Nav */}
      <header style={{ borderBottom: `1px solid rgba(255,255,255,0.08)`, padding: "0 12px 0 16px", display: "flex", alignItems: "center", height: 52, flexShrink: 0, background: BRAND_NAVY, width: "100%", boxSizing: "border-box", overflow: "visible" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginRight: 36 }}>
          <div style={{ width: 28, height: 28, background: BRAND_TEAL, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: BRAND_NAVY, fontFamily: '"Roboto", Arial, sans-serif' }}>X</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#ffffff", fontFamily: '"Roboto", Arial, sans-serif', letterSpacing: "-0.01em" }}>PulseX</span>
        </div>
        <nav style={{ display: "flex", gap: 3, overflowX: "auto", overflowY: "visible", flex: 1, scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{
              background: view === n.id ? BRAND_TEAL_L : "none",
              border: `1px solid ${view === n.id ? BRAND_TEAL + "50" : "rgba(255,255,255,0.1)"}` ,
              color: view === n.id ? BRAND_TEAL : "rgba(255,255,255,0.65)", padding: "5px 14px",
              borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.07em", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, transition: "all 0.12s", flexShrink: 0,
            }}><span>{n.icon}</span><span className="nav-label">{n.label}</span></button>
          ))}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {/* ── ZOOM CONTROL ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "2px 4px" }}>
            {ZOOM_LEVELS.map(z => (
              <button key={z.id} onClick={() => setZoom(z.id)} title={`${z.label} (${z.base}px)`}
                style={{ background: zoomId === z.id ? BRAND_TEAL : "none", border: "none", borderRadius: 4, padding: "3px 7px", cursor: "pointer", fontSize: 10, fontWeight: zoomId === z.id ? 800 : 500, color: zoomId === z.id ? BRAND_NAVY : "rgba(255,255,255,0.5)", fontFamily: "inherit", boxShadow: zoomId === z.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all 0.12s" }}
              >{z.label.split(" ")[0]}</button>
            ))}
          </div>

          {/* ── SETTINGS MENU ── */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowSettingsMenu(m => !m)} style={{
              display: "flex", alignItems: "center", gap: 5,
              background: showSettingsMenu ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)",
              borderRadius: 6, padding: "5px 13px", cursor: "pointer",
              fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", fontFamily: "inherit",
            }}>⚙ SETTINGS {showSettingsMenu ? "▲" : "▼"}</button>
            {showSettingsMenu && (
              <div style={{
                position: "fixed", right: 12, top: 58, zIndex: 1500,
                background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10,
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)", minWidth: 200, overflow: "hidden",
              }}>
                {[
                  { icon: "◎", label: "Team Members",   color: "#38bdf8", action: () => { setShowTeamSettings(true); setShowSettingsMenu(false); } },
                  { icon: "◧", label: "Templates",       color: "#a78bfa", action: () => { setShowTemplates(true); setShowSettingsMenu(false); } },
                  { icon: "↓", label: "Export to Excel", color: "#34d399", action: () => { exportToExcel(projects); setShowSettingsMenu(false); } },
                  { icon: "🗓", label: "Holidays",        color: "#fb923c", action: () => { setShowHolidays(true); setShowSettingsMenu(false); } },
                  { icon: "↑", label: "Import Excel",    color: "#34d399", action: () => { setShowImport(true); setShowSettingsMenu(false); } },
                  { icon: "⊡", label: "Archived Projects",color: BRAND_TEAL, action: () => { setView("archived"); setShowSettingsMenu(false); } },
                ].map(item => (
                  <button key={item.label} onClick={item.action} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 16px", background: "none", border: "none",
                    borderBottom: "1px solid rgba(0,0,0,0.05)", cursor: "pointer",
                    fontSize: fs(12), fontWeight: 600, color: "#1f2937", fontFamily: "inherit",
                    textAlign: "left",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <span style={{ color: item.color, width: 16 }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* ── NEW PROJECT BUTTON ── */}
          <button onClick={() => setShowNewProject(true)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: BRAND_TEAL_L, border: `1px solid ${BRAND_TEAL}80`,
            color: BRAND_TEAL_D, borderRadius: 6, padding: "5px 13px", cursor: "pointer",
            fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", fontFamily: "inherit",
            transition: "all 0.12s",
          }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> NEW PROJECT
          </button>
          <div style={{ display: "flex" }}>
            {people.map(p => <div key={p.id} style={{ marginLeft: -7 }}><Avatar person={p} size={26} /></div>)}
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, padding: "12px 14px", overflow: "auto", display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box", width: "100%", minWidth: 0, zoom: zoomScale }}>
        {/* Project pills */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          {projects.map(proj => {
            const total = proj.deliverables.flatMap(d => [d, ...d.subtasks]).length;
            return (
              <div key={proj.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px 5px 12px", background: proj.color + "10", border: `1px solid ${proj.color}28`, borderRadius: 16, fontSize: 11, color: proj.color, fontWeight: 700 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: proj.color, display: "inline-block" }} />
                {/* Project name → opens project details modal */}
                <span
                  onClick={() => setProjectDetailsId(proj.id)}
                  title="View project details"
                  style={{ cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 2 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >{proj.name}</span>
                <span style={{ opacity: 0.45, fontWeight: 400 }}>{total} items</span>
                <span onClick={() => setNewDeliverable(proj)} title="Add deliverable" style={{ cursor: "pointer", opacity: 0.4, fontWeight: 900, fontSize: 13, lineHeight: 1, transition: "opacity 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.4}
                >+</span>
                {/* ··· project menu */}
                <span onClick={() => setProjectMenu(proj)} title="Project options" style={{ cursor: "pointer", opacity: 0.35, fontSize: 12, lineHeight: 1, letterSpacing: "0.05em", transition: "opacity 0.12s", paddingLeft: 1 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0.35}
                >···</span>
              </div>
            );
          })}
          <button onClick={() => setShowNewProject(true)} style={{
            background: "none", border: "1px dashed rgba(0,0,0,0.1)", borderRadius: 16,
            color: "#9ca3af", padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700,
            fontFamily: "inherit", transition: "all 0.12s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.6)"; e.currentTarget.style.color = "#d97706"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)"; e.currentTarget.style.color = "#334155"; }}
          >+ New Project</button>
          {/* Archived toggle */}
          {archivedProjects.length > 0 && (
            <button onClick={() => setShowArchived(a => !a)} style={{
              background: "none", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 16,
              color: showArchived ? "#fbbf24" : "#334155", padding: "5px 12px", cursor: "pointer",
              fontSize: 11, fontWeight: 700, fontFamily: "inherit", transition: "all 0.12s",
            }}>
              {showArchived ? "▲" : "▼"} {archivedProjects.length} Archived
            </button>
          )}
        </div>

        {/* Archived projects tray */}
        {showArchived && archivedProjects.length > 0 && (
          <div style={{ background: "#eceef2", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "14px 18px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 12 }}>Archived Projects</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {archivedProjects.map(proj => (
                <div key={proj.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: proj.color, opacity: 0.5 }} />
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, flex: 1 }}>{proj.name}</span>
                  {proj.client && <span style={{ fontSize: 11, color: "#9ca3af" }}>{proj.client}</span>}
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{proj.deliverables.length} deliverables</span>
                  <button onClick={() => handleRestoreProject(proj.id)} style={{
                    background: proj.color + "18", border: `1px solid ${proj.color}30`, borderRadius: 5,
                    color: proj.color, padding: "3px 10px", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "inherit",
                  }}>Restore</button>
                  <button onClick={() => handleDeleteProject(proj.id)} style={{
                    background: "none", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 5,
                    color: "#f87171", padding: "3px 10px", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "inherit",
                  }}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "myhub" && (
          <MyHubView
            projects={projects} people={people} holidays={holidays} pto={pto}
            currentUserId={currentUserId} onSetCurrentUser={setCurrentUser}
            onEditItem={handleEditItem} onMarkDone={handleMarkDone}
            savePto={savePto} deletePto={deletePto}
          />
        )}
        {view === "dashboard" && <DashboardView projects={projects} people={people} holidays={holidays} pto={pto} savePto={savePto} onEditItem={handleEditItem} onAddDeliverable={(proj) => setNewDeliverable(proj)} onAddSubtask={(proj, del) => setNewSubtask({ project: proj, deliverable: del })} onNewProject={() => setShowNewProject(true)} onOpenProject={id => setProjectDetailsId(id)} />}
        {view === "timeline"  && (
          <TimelineView projects={projects} people={people} onEditItem={handleEditItem}
            onAddDeliverable={(proj) => setNewDeliverable(proj)}
            onAddSubtask={(proj, del) => setNewSubtask({ project: proj, deliverable: del })}
            onMarkDone={handleMarkDone} onSaveItem={handleSaveItem} holidays={holidays}
            onInsertSubtask={handleInsertSubtask}
            onReorderSubtasks={handleReorderSubtasks}
            onDeleteSubtask={handleDeleteSubtask}
            statusNotes={statusNotes}
            onUpdateNote={handleUpdateNote}
            onSaveProject={handleSaveProject}
            onOpenProject={id => setProjectDetailsId(id)}
            clipboard={clipboard}
            onCopySubtask={handleCopySubtask}
            onCopyDeliverable={handleCopyDeliverable}
            onPasteSubtask={handlePasteSubtask}
            onPasteDeliverable={handlePasteDeliverable}
          />
        )}
        {view === "people"  && <PeopleView projects={projects} people={people} onEditItem={handleEditItem} onMarkDone={handleMarkDone} onSaveItem={handleSaveItem} holidays={holidays} pto={pto} />}
        {view === "workload" && (
          <WorkloadView projects={projects} people={people} onEditItem={handleEditItem} pto={pto} holidays={holidays} />
        )}
        {view === "archived" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>Archived Projects</div>
            {archivedProjects.length === 0 && (
              <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                No archived projects yet. Archive a project from its ··· menu.
              </div>
            )}
            {archivedProjects.map(proj => (
              <div key={proj.id} style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: proj.color, opacity: 0.6 }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#374151", flex: 1 }}>{proj.name}</span>
                  {proj.client && <span style={{ fontSize: 12, color: "#6b7280" }}>{proj.client}</span>}
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{proj.deliverables.length} deliverables</span>
                  <button onClick={() => handleRestoreProject(proj.id)} style={{
                    background: proj.color + "18", border: `1px solid ${proj.color}40`, borderRadius: 6,
                    color: proj.color, padding: "5px 14px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                  }}>Restore</button>
                  <button onClick={() => handleDeleteProject(proj.id)} style={{
                    background: "none", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 6,
                    color: "#f87171", padding: "5px 14px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                  }}>Delete</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {proj.deliverables.map(d => (
                    <div key={d.id} style={{ fontSize: fs(11), color: "#6b7280", background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: "3px 10px" }}>{d.title}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {view === "status"  && <StatusView projects={projects} people={people} statusNotes={statusNotes} onUpdateNote={handleUpdateNote} onAddDeliverable={(proj) => setNewDeliverable(proj)} onAddSubtask={(proj, del) => setNewSubtask({ project: proj, deliverable: del })} onSaveTrackOverride={(projId, delId, val) => setProjects(ps => ps.map(p => p.id !== projId ? p : { ...p, deliverables: p.deliverables.map(d => d.id !== delId ? d : { ...d, trackOverride: val }) }))} onEditItem={handleEditItem} onOpenProject={id => setProjectDetailsId(id)} />}
      </main>

      {/* ── Modals ── */}
      {showHolidays && (
        <HolidaysModal holidays={holidays} onClose={() => setShowHolidays(false)} onSave={async (newHolidays) => {
          setHolidays(newHolidays);
          setShowHolidays(false);
          // Persist to Supabase
          if (SB_READY) {
            await sbFetch("holidays?id=neq.00000000", { method: "DELETE", prefer: "return=minimal" });
            for (const h of newHolidays) { await sb.upsert("holidays", { date: h.date, name: h.name }); }
          }
          const newHolidayDates = new Set(newHolidays.map(h => h.date));
          const nextWorkDay = (dateStr) => {
            let d = new Date(dateStr + "T00:00:00");
            while (newHolidayDates.has(d.toISOString().slice(0,10)) || d.getDay()===0 || d.getDay()===6) {
              d = new Date(d.getTime() + 86400000);
            }
            return d.toISOString().slice(0,10);
          };
          // Push any task whose start or end lands on a holiday forward, then cascade
          setProjects(projs => {
            let updated = projs;
            projs.forEach(proj => {
              proj.deliverables.forEach(del => {
                [del, ...del.subtasks].forEach(item => {
                  const newEnd   = nextWorkDay(item.end);
                  const newStart = nextWorkDay(item.start);
                  if (newEnd !== item.end || newStart !== item.start) {
                    updated = cascadeDates(updated, item.id, newEnd, newHolidays);
                  }
                });
              });
            });
            return updated;
          });
        }} />
      )}
      {showTeamSettings && (
        <TeamSettingsModal people={people} onClose={() => setShowTeamSettings(false)} onSave={async (newPeople) => {
            setPeople(newPeople);
            // Upsert all members
            for (let i = 0; i < newPeople.length; i++) {
              await sb.upsert("team_members", { id: newPeople[i].id, name: newPeople[i].name, color: newPeople[i].color, position: i });
            }
          }} />
      )}
      {showTemplates && (
        <TemplatesModal
          existingColors={projects.map(p => p.color)}
          savedTemplates={savedTemplates}
          onClose={() => setShowTemplates(false)}
          onAdd={handleAddProject}
          onSaveTemplate={(tpl) => setSavedTemplates(t => [...t, tpl])}
        />
      )}
      {projectMenu && (
        <ProjectMenu
          proj={projectMenu}
          onClose={() => setProjectMenu(null)}
          onArchive={handleArchiveProject}
          onDelete={handleDeleteProject}
          onRename={handleRenameProject}
          onSaveAsTemplate={handleSaveAsTemplate}
        />
      )}
      {showImport && (
        <ExcelImportModal
          existingColors={projects.map(p => p.color)}
          onClose={() => setShowImport(false)}
          onImport={handleAddProject}
        />
      )}
      {showNewProject && (
        <NewProjectModal
          existingColors={projects.map(p => p.color)}
          onClose={() => setShowNewProject(false)}
          onAdd={handleAddProject}
        />
      )}
      {newDeliverable && (
        <NewDeliverableModal
          project={newDeliverable}
          allPeople={people}
          savedTemplates={savedTemplates}
          onClose={() => setNewDeliverable(null)}
          onAdd={handleAddDeliverable}
        />
      )}
      {newSubtask && (
        <NewSubtaskModal
          project={newSubtask.project}
          deliverable={newSubtask.deliverable}
          allPeople={people}
          onClose={() => setNewSubtask(null)}
          onAdd={handleAddSubtask}
        />
      )}
      {projectDetailsId && projects.concat(archivedProjects).find(p => p.id === projectDetailsId) && (
        <ProjectDetailsModal
          proj={projects.concat(archivedProjects).find(p => p.id === projectDetailsId)}
          people={people}
          onClose={() => setProjectDetailsId(null)}
          onSave={handleSaveProjectDetails}
          onArchive={(id) => { handleArchiveProject(id); setProjectDetailsId(null); }}
          onDelete={(id) => { handleDeleteProject(id); setProjectDetailsId(null); }}
          onSaveAsTemplate={(proj) => { handleSaveAsTemplate(proj); }}
        />
      )}
      {editingItem && (
        <TaskModal
          item={editingItem}
          projectColor={editingItem.projectColor || "#f59e0b"}
          allItems={getSiblingItems(editingItem)}
          allPeople={people}
          holidays={holidays}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveItem}
          onDelete={editingItem.deliverableId
            ? () => handleDeleteSubtask(editingItem.projectId, editingItem.deliverableId, editingItem.id)
            : editingItem.projectId
              ? () => handleDeleteDeliverable(editingItem.projectId, editingItem.id)
              : null
          }
          statusNotes={statusNotes}
          onUpdateNote={handleUpdateNote}
          trackStatus={(() => {
            // Find the deliverable-level track status for this item
            const projId = editingItem.projectId;
            const delId  = editingItem.deliverableId || editingItem.id;
            const proj   = projects.find(p => p.id === projId);
            const del    = proj?.deliverables.find(d => d.id === delId);
            return del?.trackOverride || null;
          })()}
        />
      )}
    </div>
  );
}
