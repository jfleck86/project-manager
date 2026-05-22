import React, { useState, useRef, useEffect, useCallback } from "react";

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

const statusMeta = {
  "Not Started":      { color: "#6b7280", bg: "rgba(100,116,139,0.15)" },
  "In Progress":      { color: "#38bdf8", bg: "rgba(56,189,248,0.15)"  },
  "Done":             { color: "#34d399", bg: "rgba(52,211,153,0.15)"  },
  "Blocked":          { color: "#f87171", bg: "rgba(248,113,113,0.15)" },
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
      background: m.bg, color: m.color, border: `1px solid ${m.color}40`,
      borderRadius: 4, padding: small ? "1px 6px" : "2px 8px",
      fontSize: small ? 10 : 11, fontWeight: 600, letterSpacing: "0.05em", whiteSpace: "nowrap",
    }}>{status}</span>
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

// --- TASK EDIT MODAL ──────────────────────────────────────────────────────────
function TaskModal({ item, projectColor, allItems, onClose, onSave, allPeople, onDelete, holidays = [] }) {
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 12, width: 580, maxHeight: "92vh", overflow: "auto", boxShadow: "0 30px 90px rgba(0,0,0,0.35)" }}>
        {/* Header */}
        <div style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", padding: "18px 22px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 4, height: 22, background: projectColor, borderRadius: 2, flexShrink: 0 }} />
          <input value={form.title} onChange={e => set("title", e.target.value)}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#111827", fontSize: 17, fontWeight: 700, fontFamily: "inherit" }} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
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
          {/* Department */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={labelStyle}>Department</div>
              <select value={form.department || ""} onChange={e => set("department", e.target.value)} style={selectStyle}>
                <option value="">— None —</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            {form.department && (
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                <DeptBadge dept={form.department} />
              </div>
            )}
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
          {/* Dependencies */}
          {allItems && allItems.length > 0 && (
            <div>
              <div style={labelStyle}>Dependencies</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {allItems.filter(x => x.id !== item.id).map(dep => {
                  const active = (form.dependencies || []).includes(dep.id);
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
            </div>
          )}
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
          background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.4)",
          color: "#d97706", borderRadius: 6, padding: "5px 12px", cursor: "pointer",
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
              cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#1f2937", fontFamily: "inherit", textAlign: "left",
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

function DashboardView({ projects, people, onEditItem, onAddDeliverable, onAddSubtask, onNewProject }) {
  const allDeliverables = projects.flatMap(p => p.deliverables.map(d => ({ ...d, projectId: p.id, projectName: p.name, projectColor: p.color })));
  const allSubtasks = projects.flatMap(p => p.deliverables.flatMap(d => d.subtasks.map(s => ({ ...s, projectId: p.id, projectName: p.name, projectColor: p.color, deliverableId: d.id }))));
  const allItems = [...allDeliverables, ...allSubtasks];
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
    <th onClick={() => toggleSort(col)} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: sortCol === col ? "#d97706" : "#6b7280", letterSpacing: "0.07em", textTransform: "uppercase", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
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
        <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 14 }}>Work Distribution by Department</div>
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
                    <span style={{ fontSize: 11, color: "#6b7280" }}>{done}/{all.length} done {blocked > 0 && <span style={{ color: "#f87171", marginLeft: 8 }}>⚠ {blocked}</span>}</span>
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
                    <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: d.status === "Done" ? "#9ca3af" : "#1f2937", textDecoration: d.status === "Done" ? "line-through" : "none", cursor: "pointer" }} onClick={() => onEditItem(d)}>{d.title}</td>
                    <td style={{ padding: "10px 14px" }}><span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: d.projectColor, display: "inline-block" }} />{d.projectName}</span></td>
                    <td style={{ padding: "10px 14px" }}><StatusBadge status={d.status} small /></td>
                    <td style={{ padding: "10px 14px" }}><PriorityDot priority={d.priority} /></td>
                    <td style={{ padding: "10px 14px" }}><div style={{ display: "flex" }}>{d.assignees.map(id => { const p = people.find(x => x.id === id); return p ? <div key={id} style={{ marginRight: -5 }}><Avatar person={p} size={22} /></div> : null; })}</div></td>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280" }}>{fmt(parseDate(d.start))}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280" }}>{fmt(parseDate(d.end))}</td>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: "#6b7280" }}>{durDays(d.start, d.end)}d</td>
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
                      <td style={{ padding: "6px 14px 6px 28px", fontSize: 11, color: sub.status === "Done" ? "#9ca3af" : "#374151", textDecoration: sub.status === "Done" ? "line-through" : "none", cursor: "pointer" }}
                        onClick={() => onEditItem({ ...sub, projectId: d.projectId, projectName: d.projectName, projectColor: d.projectColor, deliverableId: d.id })}>
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
                      <td style={{ padding: "6px 14px", fontSize: 11, color: "#9ca3af" }}>{sub.start && sub.end ? durDays(sub.start, sub.end) + "d" : "—"}</td>
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
const COL_DEFAULTS = { num: 38, title: 220, start: 96, end: 96, dur: 56, deps: 86, assignees: 96 };
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

function TimelineView({ projects, people, onEditItem, onAddDeliverable, onAddSubtask, onMarkDone, onSaveItem, holidays = [], onInsertSubtask, onReorderSubtasks, onDeleteSubtask }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('planr_collapsed') || '{}'); } catch { return {}; }
  });
  const toggle = (id) => setCollapsed(c => {
    const next = { ...c, [id]: !c[id] };
    try { localStorage.setItem('planr_collapsed', JSON.stringify(next)); } catch {}
    return next;
  });
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const toggleProjFilter = (id) => setSelectedProjects(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const visibleProjects = selectedProjects.length === 0 ? projects : projects.filter(p => selectedProjects.includes(p.id));
  const [DAY_W, setDayW] = useState(24);
  const [colWidths, setColWidths] = useState({ ...COL_DEFAULTS });
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
    {/* Project filter pills */}
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Show:</span>
      <div onClick={() => setSelectedProjects([])} style={{
        padding: "3px 10px", borderRadius: 12, cursor: "pointer", fontSize: 11, fontWeight: 700,
        background: selectedProjects.length === 0 ? "rgba(0,0,0,0.1)" : "transparent",
        border: `1px solid ${selectedProjects.length === 0 ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.1)"}`,
        color: selectedProjects.length === 0 ? "#111827" : "#6b7280",
      }}>All Projects</div>
      {projects.map(p => (
        <div key={p.id} onClick={() => toggleProjFilter(p.id)} style={{
          padding: "3px 10px", borderRadius: 12, cursor: "pointer", fontSize: 11, fontWeight: 700,
          background: selectedProjects.includes(p.id) ? p.color + "18" : "transparent",
          border: `1px solid ${selectedProjects.includes(p.id) ? p.color + "80" : "rgba(0,0,0,0.1)"}`,
          color: selectedProjects.includes(p.id) ? p.color : "#6b7280",
        }}>{p.name}</div>
      ))}
    </div>
    <div ref={containerRef} style={{ background: "#eceef2", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden", fontFamily: "inherit" }}>
      {/* Sticky header row — month labels */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#f5f6f8", position: "sticky", top: 0, zIndex: 20 }}>
        {/* Left table header with resize handles */}
        <div style={{ width: LEFT_W, flexShrink: 0, display: "flex", borderRight: "1px solid rgba(0,0,0,0.07)" }}>
          {[["#","num"],["Title","title"],["Start","start"],["End","end"],["Dur","dur"],["Deps","deps"],["Assigned To","assignees"]].map(([label, key]) => (
            <div key={key} style={{ width: colWidths[key], position: "relative", padding: "10px 8px", fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.09em", flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.05)", whiteSpace: "nowrap", overflow: "hidden", userSelect: "none" }}>
              {label.toUpperCase()}
              {/* Drag handle */}
              <div onMouseDown={(e) => startResizeCol(key, e)} style={{
                position: "absolute", right: 0, top: 0, bottom: 0, width: 6, cursor: "col-resize",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ width: 2, height: 14, background: "rgba(0,0,0,0.15)", borderRadius: 1 }} />
              </div>
            </div>
          ))}
        </div>
        {/* Scrollable month header */}
        <div style={{ flex: 1, overflow: "hidden" }} ref={scrollRef}>
          <div style={{ width: totalDays * DAY_W, height: 38, position: "relative" }}>
            {months.map((m, i) => (
              <div key={i} style={{ position: "absolute", left: m.offset * DAY_W, width: m.days * DAY_W, height: "100%", display: "flex", alignItems: "center", paddingLeft: 8, fontSize: 10, fontWeight: 800, color: "#6b7280", letterSpacing: "0.1em", textTransform: "uppercase", borderRight: "1px solid rgba(0,0,0,0.06)" }}>{m.label}</div>
            ))}
            <div style={{ position: "absolute", left: todayOff * DAY_W, top: 0, bottom: 0, width: 2, background: "#f59e0b", opacity: 0.9 }} />
          </div>
        </div>
      </div>

      {/* Body — synced horizontal scroll */}
      <TimelineBody
        projects={visibleProjects} people={people} collapsed={collapsed} toggle={toggle}
        weeks={weeks} todayOff={todayOff} allItemsFlat={allItemsFlat}
        onEditItem={onEditItem} headerScrollRef={scrollRef}
        onAddDeliverable={onAddDeliverable} onAddSubtask={onAddSubtask}
        onMarkDone={onMarkDone} onSaveItem={onSaveItem} rowIndex={rowIndex} DAY_W={DAY_W}
        colWidths={colWidths} LEFT_W={LEFT_W} holidays={holidays}
        onInsertSubtask={onInsertSubtask} onReorderSubtasks={onReorderSubtasks} onDeleteSubtask={onDeleteSubtask}
      />
    </div>
    </div>
  );
}

function TimelineBody({ projects, people, collapsed, toggle, weeks, todayOff, allItemsFlat, onEditItem, headerScrollRef, onAddDeliverable, onAddSubtask, onMarkDone, onSaveItem, rowIndex, DAY_W, colWidths, LEFT_W, holidays = [], onInsertSubtask, onReorderSubtasks, onDeleteSubtask }) {
  const bodyRef = useRef(null);

  const syncScroll = (e) => {
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = e.target.scrollLeft;
  };

  return (
    <div style={{ overflowX: "auto", overflowY: "visible" }} onScroll={syncScroll} ref={bodyRef}>
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
            onInsertSubtask={onInsertSubtask} onReorderSubtasks={onReorderSubtasks} onDeleteSubtask={onDeleteSubtask} />
        ))}
        {/* Today footer */}
        <div style={{ display: "flex", height: 22, background: "#e8eaee", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ width: LEFT_W, flexShrink: 0 }} />
          <div style={{ flex: 1, position: "relative", width: totalDays * DAY_W }}>
            <div style={{ position: "absolute", left: todayOff * DAY_W - 20, top: "50%", transform: "translateY(-50%)", background: "#f59e0b", color: "#000", fontSize: 9, fontWeight: 900, padding: "2px 7px", borderRadius: 3, letterSpacing: "0.08em" }}>TODAY</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectSection({ proj, people, collapsed, toggle, weeks, todayOff, allItemsFlat, onEditItem, onAddDeliverable, onAddSubtask, onMarkDone, onSaveItem, rowIndex, DAY_W, colWidths, LEFT_W, onInsertSubtask, onReorderSubtasks, onDeleteSubtask }) {
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
        <div style={{ width: LEFT_W, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 12px", gap: 8, borderRight: "1px solid rgba(0,0,0,0.06)", height: "100%" }}
          onClick={() => toggle(proj.id)}>
          {/* Collapse chevron */}
          <span style={{ fontSize: 10, color: "#6b7280", lineHeight: 1, width: 12, flexShrink: 0, transition: "transform 0.15s", display: "inline-block", transform: isProjCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
          <div style={{ width: 3, height: 16, background: proj.color, borderRadius: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: proj.color, letterSpacing: "0.05em", textTransform: "uppercase", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proj.name}</span>
          <span style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0 }}>{proj.deliverables.length}d</span>
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
          <div style={{ position: "absolute", left: todayOff * DAY_W, top: 0, bottom: 0, width: 2, background: "#f59e0b22" }} />
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
          onInsertSubtask={onInsertSubtask} onReorderSubtasks={onReorderSubtasks} onDeleteSubtask={onDeleteSubtask} />
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

function DeliverableRow({ del, proj, people, collapsed, toggle, weeks, todayOff, allItemsFlat, onEditItem, onAddSubtask, onMarkDone, onSaveItem, rowIndex, DAY_W, colWidths, LEFT_W, onInsertSubtask, onReorderSubtasks, onDeleteSubtask }) {
  const isCollapsed = collapsed[del.id];
  const rowNum = rowIndex.index[del.id] || "?";
  const startOff = dayOffset(del.start);
  const endOff   = dayOffset(del.end);
  const barW = Math.max((endOff - startOff) * DAY_W, 8);

  const save = (patch) => {
    const merged = { ...del, ...patch };
    // Keep dependencies[] in sync with depsText when depsText changes
    if ('depsText' in patch && rowIndex) {
      const ids = (patch.depsText || '').split(',').map(s => s.trim()).filter(Boolean)
        .map(num => { const e = rowIndex.reverse[parseInt(num)]; return e ? e.id : null; })
        .filter(Boolean);
      merged.dependencies = ids;
    }
    onSaveItem({ ...merged, projectId: proj.id, projectName: proj.name, projectColor: proj.color });
  };

  const depsDisplay = (del.depsText || "");
  const [ctxMenu, setCtxMenu] = useState(null);
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
      <div style={{ display: "flex", height: D_ROW, borderBottom: "1px solid rgba(0,0,0,0.05)", alignItems: "center", background: "rgba(245,158,11,0.03)" }}
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
            <span onClick={() => onEditItem({ ...del, projectId: proj.id, projectName: proj.name, projectColor: proj.color })} style={{ fontSize: 11, fontWeight: 700, color: del.status === "Done" ? "#9ca3af" : "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textDecoration: del.status === "Done" ? "line-through" : "none", cursor: "pointer" }} title={"Click to edit: " + del.title}>{del.title}</span>
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
          <span style={{ fontSize: 10, color: "#6b7280", padding: "2px 3px" }}>{durDays(del.start, del.end)}d</span>
        </LeftCell>

        {/* Dependencies */}
        <LeftCell width={colWidths.deps}>
          <InlineDeps value={del.depsText || ""} onChange={v => save({ depsText: v })} />
        </LeftCell>

        {/* Assignees */}
        <LeftCell width={colWidths.assignees} last>
          <InlineAssignees assignees={del.assignees} people={people} onChange={v => save({ assignees: v })} />
        </LeftCell>

        {/* Chart */}
        <div style={{ flex: 1, height: "100%", position: "relative", width: totalDays * DAY_W }}>
          {weeks.map(w => <div key={w} style={{ position: "absolute", left: w * DAY_W, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.04)" }} />)}
          <div style={{ position: "absolute", left: todayOff * DAY_W, top: 0, bottom: 0, width: 2, background: "#f59e0b22" }} />
          {depArrows.map(({ depEndOff, thisStartOff, key }) => {
            const x1 = depEndOff * DAY_W; const x2 = thisStartOff * DAY_W;
            const midY = D_ROW / 2;
            return (
              <svg key={key} style={{ position: "absolute", left: 0, top: 0, width: totalDays * DAY_W, height: D_ROW, pointerEvents: "none", overflow: "visible" }}>
                <path d={`M ${x1} ${midY} C ${(x1+x2)/2} ${midY}, ${(x1+x2)/2} ${midY}, ${x2} ${midY}`} stroke="#f59e0b" strokeWidth={1.5} fill="none" strokeDasharray="4 3" opacity={0.6} />
                <polygon points={`${x2},${midY} ${x2-5},${midY-3} ${x2-5},${midY+3}`} fill="#f59e0b" opacity={0.6} />
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
                  ? '2px solid #f59e0b' : 'none',
                outlineOffset: -2,
                transition: 'opacity 0.1s',
                cursor: dragState.dragIdx !== null ? 'grabbing' : 'default',
              }}
            >
              <SubtaskRow sub={sub} del={del} proj={proj} people={people}
                weeks={weeks} todayOff={todayOff} allItemsFlat={allItemsFlat} onEditItem={onEditItem}
                onMarkDone={onMarkDone} onSaveItem={onSaveItem} rowIndex={rowIndex} DAY_W={DAY_W} colWidths={colWidths} LEFT_W={LEFT_W}
                onInsertSubtask={onInsertSubtask} onReorderSubtasks={onReorderSubtasks} onDeleteSubtask={onDeleteSubtask}
                onDragHandlePointerDown={(e) => startDrag(e, subIdx)} />
            </div>
          ))}
        </div>
      )}
      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)} items={[
          { icon: '↑', label: 'Insert subtask above', action: () => {
            const afterId = ctxMenu.subIdx > 0 ? del.subtasks[ctxMenu.subIdx - 1].id : null;
            const newSub = { id: 's_' + Date.now(), title: 'New subtask', status: 'Not Started', priority: 'Medium', assignees: [], start: del.start, end: del.end, progress: 0, dependencies: [], department: '' };
            onInsertSubtask(proj.id, del.id, afterId, newSub);
          }},
          { icon: '↓', label: 'Insert subtask below', action: () => {
            const afterId = del.subtasks[ctxMenu.subIdx]?.id || null;
            const newSub = { id: 's_' + Date.now(), title: 'New subtask', status: 'Not Started', priority: 'Medium', assignees: [], start: del.start, end: del.end, progress: 0, dependencies: [], department: '' };
            onInsertSubtask(proj.id, del.id, afterId, newSub);
          }},
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

function SubtaskRow({ sub, del, proj, people, weeks, todayOff, allItemsFlat, onEditItem, onMarkDone, onSaveItem, rowIndex, DAY_W, colWidths, LEFT_W, onInsertSubtask, onReorderSubtasks, onDeleteSubtask, onDragHandlePointerDown }) {
  const m = statusMeta[sub.status] || statusMeta["Not Started"];
  const rowNum = rowIndex.index[sub.id] || "?";
  const startOff = dayOffset(sub.start);
  const endOff   = dayOffset(sub.end);
  const barW = Math.max((endOff - startOff) * DAY_W, 6);

  const save = (patch) => {
    const merged = { ...sub, ...patch };
    if ('depsText' in patch && rowIndex) {
      const ids = (patch.depsText || '').split(',').map(s => s.trim()).filter(Boolean)
        .map(num => { const e = rowIndex.reverse[parseInt(num)]; return e ? e.id : null; })
        .filter(Boolean);
      merged.dependencies = ids;
    }
    onSaveItem({ ...merged, projectId: proj.id, projectName: proj.name, projectColor: proj.color, deliverableId: del.id });
  };

  const depArrows = (sub.dependencies || []).map(depId => {
    const dep = allItemsFlat.find(x => x.id === depId);
    if (!dep) return null;
    return { depEndOff: dayOffset(dep.end), thisStartOff: startOff, key: depId };
  }).filter(Boolean);

  return (
    <div style={{ display: "flex", height: S_ROW, borderBottom: "1px solid rgba(0,0,0,0.03)", alignItems: "center", background: "rgba(0,0,0,0.025)" }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.025)"}>

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
          <span onClick={() => onEditItem({ ...sub, projectId: proj.id, projectName: proj.name, projectColor: proj.color, deliverableId: del.id })} style={{ fontSize: 11, color: sub.status === "Done" ? "#9ca3af" : "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: sub.status === "Done" ? "line-through" : "none", flex: 1, cursor: "pointer" }} title={"Click to edit · Right-click for options"}>{sub.title}</span>
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
        <span style={{ fontSize: 10, color: "#9ca3af", padding: "2px 3px" }}>{durDays(sub.start, sub.end)}d</span>
      </LeftCell>

      {/* Dependencies */}
      <LeftCell width={colWidths.deps}>
        <InlineDeps value={sub.depsText || ""} onChange={v => save({ depsText: v })} />
      </LeftCell>

      {/* Assignees */}
      <LeftCell width={colWidths.assignees} last>
        <InlineAssignees assignees={sub.assignees} people={people} onChange={v => save({ assignees: v })} />
      </LeftCell>

      {/* Chart */}
      <div style={{ flex: 1, height: "100%", position: "relative", width: totalDays * DAY_W }}>
        {weeks.map(w => <div key={w} style={{ position: "absolute", left: w * DAY_W, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.025)" }} />)}
        <div style={{ position: "absolute", left: todayOff * DAY_W, top: 0, bottom: 0, width: 2, background: "#f59e0b15" }} />
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

function LeftCell({ width, children, last, center }) {
  return (
    <div style={{
      width, flexShrink: 0, padding: "0 4px", display: "flex", flexDirection: "column",
      justifyContent: "center", gap: 2, overflow: "hidden",
      borderRight: last ? "1px solid rgba(0,0,0,0.07)" : "1px solid rgba(0,0,0,0.05)",
      height: "100%", alignItems: center ? "center" : "flex-start",
    }}>{children}</div>
  );
}

function InlineDate({ value, onChange, small }) {
  const [editing, setEditing] = useState(false);
  if (editing) return (
    <input type="date" defaultValue={value} autoFocus
      onBlur={e => { onChange(e.target.value); setEditing(false); }}
      style={{ fontSize: 10, border: "1px solid #f59e0b", borderRadius: 3, padding: "1px 3px",
        background: "#fff8f0", color: "#111827", fontFamily: "inherit", width: "100%", outline: "none" }} />
  );
  return (
    <span onClick={() => setEditing(true)} title="Click to edit"
      style={{ fontSize: small ? 10 : 11, color: "#374151", cursor: "text", padding: "2px 3px",
        borderRadius: 3, border: "1px solid transparent", display: "block", width: "100%",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#f59e0b"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
    >{value ? fmt(parseDate(value)) : "—"}</span>
  );
}

function InlineDeps({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const open = () => { setDraft(value || ""); setEditing(true); };
  const commit = () => { onChange(draft.trim()); setEditing(false); };
  if (editing) return (
    <input value={draft} autoFocus onChange={e => setDraft(e.target.value)}
      onBlur={commit} onKeyDown={e => e.key === "Enter" && commit()}
      placeholder="e.g. 3,5"
      style={{ fontSize: 10, border: "1px solid #f59e0b", borderRadius: 3, padding: "1px 3px",
        background: "#fff8f0", color: "#111827", fontFamily: "inherit", width: "100%", outline: "none" }} />
  );
  return (
    <span onClick={open} title="Row numbers, comma-separated"
      style={{ fontSize: 10, color: value ? "#374151" : "#9ca3af", cursor: "text", padding: "2px 3px",
        borderRadius: 3, border: "1px solid transparent", display: "block", width: "100%",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#f59e0b"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
    >{value || "—"}</span>
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
              textAlign: "center", fontSize: 11, color: "#6b7280", cursor: "pointer", fontWeight: 600,
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
function PeopleView({ projects, people, onEditItem, onMarkDone, onSaveItem, holidays = [] }) {
  const allDeliverables = projects.flatMap(p => p.deliverables.map(d => ({ ...d, projectId: p.id, projectName: p.name, projectColor: p.color })));
  const allSubtasks = projects.flatMap(p => p.deliverables.flatMap(d => d.subtasks.map(s => ({ ...s, projectId: p.id, projectName: p.name, projectColor: p.color, deliverableId: d.id }))));
  const allItems = [...allDeliverables, ...allSubtasks];
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
    <th onClick={() => toggleSort(col)} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: sortCol === col ? "#d97706" : "#6b7280", letterSpacing: "0.07em", textTransform: "uppercase", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
      {label} {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );
  const [selected, setSelected] = useState(people[0]?.id || "");

  const person = people.find(p => p.id === selected);
  const myItems = allItems.filter(t => t.assignees && t.assignees.includes(selected));
  const byStatus = STATUSES.reduce((a, s) => ({ ...a, [s]: myItems.filter(t => t.status === s) }), {});

  // Person-Gantt: compute date range from their tasks
  const myDates = myItems.flatMap(t => [t.start, t.end]).filter(Boolean).sort();
  const ganttStart = myDates.length ? new Date(myDates[0] + "T00:00:00") : TIMELINE_START;
  const ganttEnd   = myDates.length ? new Date(myDates[myDates.length-1] + "T00:00:00") : TIMELINE_END;
  const ganttDays  = Math.max(7, Math.ceil((ganttEnd - ganttStart) / 86400000) + 7);
  const GDAY_W     = 18;
  const G_ROW      = 28;
  const holidaySet = new Set(holidays.map(h => h.date));

  const gOffset = (dateStr) => Math.ceil((parseDate(dateStr) - ganttStart) / 86400000);

  // Drag state for person gantt bars
  const draggingRef = useRef(null);

  const startDrag = (item, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const origStart = item.start;
    const origEnd = item.end;
    const origDur = Math.ceil((parseDate(origEnd) - parseDate(origStart)) / 86400000);

    const onMove = (mv) => {
      const deltaDays = Math.round((mv.clientX - startX) / GDAY_W);
      if (deltaDays === 0) return;
      const newStartD = new Date(parseDate(origStart).getTime() + deltaDays * 86400000);
      const newEndD   = new Date(newStartD.getTime() + origDur * 86400000);
      const ns = newStartD.toISOString().slice(0,10);
      const ne = newEndD.toISOString().slice(0,10);
      onSaveItem({ ...item, start: ns, end: ne });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div style={{ display: "flex", gap: 18 }}>
      {/* Sidebar */}
      <div style={{ width: 210, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {people.map(p => {
          const items = allItems.filter(t => t.assignees && t.assignees.includes(p.id));
          const active = items.filter(t => t.status === "In Progress").length;
          const isSel = p.id === selected;
          return (
            <div key={p.id} onClick={() => setSelected(p.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 8, cursor: "pointer",
              background: isSel ? p.color + "14" : "#ffffff",
              border: `1px solid ${isSel ? p.color + "50" : "rgba(0,0,0,0.07)"}`,
              transition: "all 0.12s",
            }}>
              <Avatar person={p} size={34} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1f2937" }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{items.length} tasks · {active} active</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main content */}
      {person && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {/* Person header */}
          <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "18px 22px", display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar person={person} size={50} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1f2937" }}>{person.name}</div>
              <div style={{ display: "flex", gap: 14, marginTop: 5 }}>
                {STATUSES.map(s => { const cnt = (byStatus[s]||[]).length; if (!cnt) return null; return <span key={s} style={{ fontSize: 11, color: (statusMeta[s]||statusMeta["Not Started"]).color, fontWeight: 700 }}>{cnt} {s}</span>; })}
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: person.color }}>{myItems.length}</div>
              <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: "0.07em" }}>TOTAL TASKS</div>
            </div>
          </div>

          {/* ── PERSON GANTT ── */}
          {myItems.length > 0 && (
            <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 11, fontWeight: 700, color: "#6b7280", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Schedule Overview</span>
                <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 400 }}>Drag bars to reschedule · changes sync to timeline</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: (ganttDays + 2) * GDAY_W + 420, position: "relative" }}>
                  {/* Month header */}
                  <div style={{ display: "flex", background: "#f7f8fa", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    <div style={{ width: 100, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.06)", padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.07em" }}>CLIENT</div>
                    <div style={{ width: 160, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.06)", padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.07em" }}>DELIVERABLE</div>
                    <div style={{ width: 160, flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.06)", padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.07em" }}>TASK</div>
                    <div style={{ flex: 1, position: "relative", height: 28 }}>
                      {/* Generate week markers */}
                      {Array.from({ length: Math.ceil(ganttDays / 7) }, (_, wi) => {
                        const d = new Date(ganttStart.getTime() + wi * 7 * 86400000);
                        return (
                          <div key={wi} style={{ position: "absolute", left: wi * 7 * GDAY_W, height: "100%",
                            display: "flex", alignItems: "center", paddingLeft: 4, fontSize: 9, color: "#9ca3af",
                            fontWeight: 600, borderLeft: "1px solid rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>
                            {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Task rows */}
                  {myItems.map((item, idx) => {
                    const startOff = gOffset(item.start);
                    const endOff   = gOffset(item.end);
                    const barW = Math.max((endOff - startOff) * GDAY_W + GDAY_W, 8);
                    const proj = projects.find(p => p.id === item.projectId);
                    const isHoliday = (dateStr) => holidaySet.has(dateStr);
                    const isDone = item.status === "Done";
                    return (
                      <div key={item.id} style={{ display: "flex", height: G_ROW, borderBottom: "1px solid rgba(0,0,0,0.04)", alignItems: "center" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        {/* Client column */}
                        {(() => {
                          const proj = projects.find(p => p.id === item.projectId);
                          const parentDel = item.deliverableId
                            ? proj?.deliverables.find(d => d.id === item.deliverableId)
                            : null;
                          return (
                            <>
                              <div style={{ width: 100, flexShrink: 0, padding: "0 8px", borderRight: "1px solid rgba(0,0,0,0.05)", overflow: "hidden", display: "flex", alignItems: "center" }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{proj?.client || "—"}</span>
                              </div>
                              {/* Deliverable column */}
                              <div style={{ width: 160, flexShrink: 0, padding: "0 8px", borderRight: "1px solid rgba(0,0,0,0.05)", overflow: "hidden", display: "flex", alignItems: "center" }}>
                                {parentDel
                                  ? <span style={{ fontSize: 10, fontWeight: 600, color: proj?.color || "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{parentDel.title}</span>
                                  : <span style={{ fontSize: 10, fontWeight: 600, color: proj?.color || "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</span>
                                }
                              </div>
                              {/* Task column */}
                              <div style={{ width: 160, flexShrink: 0, padding: "0 8px", borderRight: "1px solid rgba(0,0,0,0.05)", overflow: "hidden", display: "flex", alignItems: "center" }}>
                                <span style={{ fontSize: 10, fontWeight: 600, color: isDone ? "#9ca3af" : "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: isDone ? "line-through" : "none" }}>
                                  {parentDel ? item.title : "—"}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                        {/* Chart */}
                        <div style={{ flex: 1, height: "100%", position: "relative", overflow: "visible" }}>
                          {/* Holiday shading */}
                          {holidays.map(h => {
                            const hOff = gOffset(h.date);
                            if (hOff < 0 || hOff > ganttDays + 2) return null;
                            return <div key={h.date} style={{ position: "absolute", left: hOff * GDAY_W, top: 0, bottom: 0, width: GDAY_W, background: "rgba(251,146,60,0.1)", pointerEvents: "none" }} />;
                          })}
                          {/* Week grid */}
                          {Array.from({ length: Math.ceil(ganttDays / 7) }, (_, wi) => (
                            <div key={wi} style={{ position: "absolute", left: wi * 7 * GDAY_W, top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.04)" }} />
                          ))}
                          {/* Draggable bar */}
                          <div
                            onMouseDown={(e) => startDrag(item, e)}
                            style={{
                              position: "absolute", left: startOff * GDAY_W, top: "50%", transform: "translateY(-50%)",
                              width: barW, height: 16, borderRadius: 4, cursor: "ew-resize",
                              background: isDone ? "#e5e7eb" : (proj?.color || "#6b7280") + "cc",
                              border: `1.5px solid ${isDone ? "#d1d5db" : (proj?.color || "#6b7280")}`,
                              overflow: "hidden", userSelect: "none",
                            }}>
                            <div style={{ position: "absolute", inset: 0, width: `${item.progress||0}%`, background: "rgba(0,0,0,0.15)" }} />
                            <div style={{ position: "relative", padding: "0 4px", fontSize: 8, fontWeight: 600, color: isDone ? "#9ca3af" : "#fff", lineHeight: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.title}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Active task columns */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {["In Progress","Blocked"].map(s => {
              const items = byStatus[s] || []; const m = statusMeta[s] || statusMeta["Not Started"];
              return (
                <div key={s} style={{ background: "#ffffff", border: `1px solid ${m.color}22`, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", borderBottom: `1px solid ${m.color}18`, display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: m.color }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: m.color }}>{s}</span>
                    <span style={{ marginLeft: "auto", background: m.bg, color: m.color, borderRadius: 9, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{items.length}</span>
                  </div>
                  <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 7, minHeight: 70 }}>
                    {items.map(item => (
                      <div key={item.id} style={{
                        background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)",
                        borderLeft: `3px solid ${item.projectColor}`, borderRadius: 6, padding: 10,
                      }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                          <CheckButton isDone={false} onClick={() => onMarkDone(item.projectId, item.deliverableId || item.id, item.deliverableId ? item.id : null)} />
                          <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onEditItem(item)}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#1f2937", marginBottom: 2 }}>{item.title}</div>
                            <div style={{ fontSize: 10, color: "#6b7280" }}>{item.projectName}</div>
                          </div>
                        </div>
                        <ProgressBar value={item.progress} color={item.projectColor} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
                          <PriorityDot priority={item.priority} />
                          {item.department && <DeptBadge dept={item.department} />}
                          <span style={{ fontSize: 10, color: "#9ca3af" }}>Due {fmt(parseDate(item.end))}</span>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && <div style={{ padding: 10, textAlign: "center", fontSize: 11, color: "#9ca3af" }}>No tasks</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Not started + done */}
          {["Not Started","Done"].map(s => {
            const items = byStatus[s] || []; if (!items.length) return null; const m = statusMeta[s] || statusMeta["Not Started"];
            return (
              <div key={s} style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", gap: 7, alignItems: "center" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: m.color }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: m.color }}>{s}</span>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>— {items.length}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 10 }}>
                  {items.map(item => (
                    <div key={item.id} onClick={() => onEditItem(item)} style={{
                      flex: "0 0 calc(33% - 6px)", background: "rgba(0,0,0,0.035)", borderRadius: 6,
                      border: "1px solid rgba(0,0,0,0.05)", borderLeft: `3px solid ${item.projectColor}`,
                      padding: 9, cursor: "pointer",
                    }}>
                      <div style={{ fontSize: 11, fontWeight: s === "Done" ? 400 : 600, color: s === "Done" ? "#9ca3af" : "#374151", textDecoration: s === "Done" ? "line-through" : "none" }}>{item.title}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{item.projectName}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
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

function StatusView({ projects, people, statusNotes, onUpdateNote, onAddDeliverable, onAddSubtask, onSaveTrackOverride, onEditItem }) {
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
      return { proj, del, track, assigneeNames, note: statusNotes[key] || "", key };
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
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280", cursor: "pointer", userSelect: "none" }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "minmax(80px,1fr) minmax(100px,1.3fr) minmax(110px,1.4fr) minmax(110px,1.4fr) minmax(80px,0.7fr) minmax(60px,0.6fr) minmax(70px,0.6fr) minmax(70px,0.7fr) minmax(120px,2fr) minmax(70px,0.7fr)", gap: 0, borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#eceef2" }}>
          {[["Client","client"],["Project","project"],["Deliverable","deliverable"],["Current Task",null],["Track","track"],["Dept",null],["Due","due"],["Team","assigned"],["Notes",null],["",null]].map(([h, col], i) => (
            <div key={i} onClick={col ? () => toggleStatusSort(col) : undefined}
              style={{ padding: "7px 10px", fontSize: 9, fontWeight: 700, color: col ? (statusSortCol === col ? "#d97706" : "#6b7280") : "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", borderRight: i < 6 ? "1px solid rgba(0,0,0,0.06)" : "none", cursor: col ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap" }}>
              {h}{col && statusSortCol === col ? (statusSortDir === "asc" ? " ↑" : " ↓") : ""}
            </div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 12 }}>No deliverables match the current filter.</div>
        )}
        {filtered.map(({ proj, del, track, assigneeNames, note, key }, i) => {
          const m = trackMeta[track];
          const currentTask = getCurrentTask(del);
          const isDone = track === "done";
          return (
            <div key={key} style={{
              display: "grid", gridTemplateColumns: "minmax(80px,1fr) minmax(100px,1.3fr) minmax(110px,1.4fr) minmax(110px,1.4fr) minmax(80px,0.7fr) minmax(60px,0.6fr) minmax(70px,0.6fr) minmax(70px,0.7fr) minmax(120px,2fr) minmax(70px,0.7fr)",
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
                  <span style={{ fontSize: 11, color: proj.color, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proj.name}</span>
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
                    onEditItem({ ...activeSub, projectId: proj.id, projectName: proj.name, projectColor: proj.color, deliverableId: del.id });
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

              {/* Status Notes */}
              <div style={{ padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                {note ? (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{note}</div>
                    <button onClick={() => openNote(proj.id, del.id)} style={{
                      marginTop: 4, background: "none", border: "none", color: "#9ca3af", cursor: "pointer",
                      fontSize: 10, fontFamily: "inherit", padding: 0,
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = "#64748b"}
                      onMouseLeave={e => e.currentTarget.style.color = "#334155"}
                    >edit ✎</button>
                  </div>
                ) : (
                  <button onClick={() => openNote(proj.id, del.id)} style={{
                    background: "none", border: "1px dashed rgba(0,0,0,0.06)", borderRadius: 5,
                    color: "#9ca3af", cursor: "pointer", padding: "4px 10px", fontSize: 10,
                    fontFamily: "inherit", transition: "all 0.12s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "#64748b"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)"; e.currentTarget.style.color = "#334155"; }}
                  >+ Add note</button>
                )}
              </div>

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
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
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
                <div style={{ fontSize: 13, color: "#6b7280" }}>{fileName || "Click to choose a file, or drag & drop"}</div>
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
                <span style={{ fontSize: 11, color: "#6b7280" }}>— {parsed.deliverables.length} deliverables, {parsed.deliverables.reduce((s, d) => s + d.subtasks.length, 0)} subtasks</span>
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
              <div style={{ fontSize: 11, color: "#6b7280", background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 6, padding: "8px 12px" }}>
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
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6b7280", cursor: "pointer" }}>
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
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6b7280", cursor: "pointer" }}>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(6px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      {children}
    </div>
  );
}
function ModalShell({ title, onClose, children, accentColor = "#f59e0b", width = 480 }) {
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
export default function App() {
  const [projects, setProjects] = useState(initialProjects);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [people, setPeople] = useState(initialPeople);
  const [view, setView] = useState("timeline");
  const [editingItem, setEditingItem] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [showHolidays, setShowHolidays] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [projectMenu, setProjectMenu] = useState(null); // proj object
  const [showArchived, setShowArchived] = useState(false);
  const [statusNotes, setStatusNotes] = useState({});
  const handleUpdateNote = (key, text) => setStatusNotes(n => ({ ...n, [key]: text }));
  const [newDeliverable, setNewDeliverable] = useState(null); // project object
  const [newSubtask, setNewSubtask] = useState(null);         // { project, deliverable }

  // ── handlers ──
  const handleEditItem = (item) => setEditingItem(item);

  const handleSaveItem = (updated) => {
    setProjects(projs => {
      const original = projs.flatMap(p => [...p.deliverables, ...p.deliverables.flatMap(d => d.subtasks)]).find(x => x.id === updated.id);
      const holidaySet = new Set(holidays.map(h => h.date));

      // Helper: advance a date past weekends and holidays
      const nextWorkDay = (dateStr) => {
        if (!dateStr) return dateStr;
        let d = new Date(dateStr + "T00:00:00");
        while (d.getDay() === 0 || d.getDay() === 6 || holidaySet.has(d.toISOString().slice(0,10))) {
          d = new Date(d.getTime() + 86400000);
        }
        return d.toISOString().slice(0,10);
      };

      // Sanitize start/end — push off weekends and holidays automatically
      const cleanStart = nextWorkDay(updated.start);
      const cleanEnd   = nextWorkDay(updated.end);
      const sanitized  = { ...updated, start: cleanStart, end: cleanEnd };

      // Apply the direct update
      let newProjs = projs.map(proj => {
        if (proj.id !== sanitized.projectId) return proj;
        return {
          ...proj,
          deliverables: proj.deliverables.map(del => {
            if (del.id === sanitized.id) return { ...del, ...sanitized };
            return { ...del, subtasks: del.subtasks.map(s => s.id === sanitized.id ? { ...s, ...sanitized } : s) };
          }),
        };
      });

      // Cascade if end date changed
      if (original && original.end !== sanitized.end) {
        newProjs = cascadeDates(newProjs, sanitized.id, sanitized.end, holidays);
      }

      // If dependencies were added, push THIS item's start to after its last predecessor
      const newDeps = sanitized.dependencies || [];
      const oldDeps = original ? (original.dependencies || []) : [];
      const addedDeps = newDeps.filter(d => !oldDeps.includes(d));
      if (addedDeps.length > 0) {
        const allItems = newProjs.flatMap(p => [...p.deliverables, ...p.deliverables.flatMap(d => d.subtasks)]);
        const predEnds = addedDeps.map(depId => allItems.find(x => x.id === depId)).filter(Boolean).map(x => x.end);
        if (predEnds.length > 0) {
          const latestPred = predEnds.sort().pop();
          const dayAfter = new Date(parseDate(latestPred).getTime() + 86400000).toISOString().slice(0,10);
          let ns = new Date(dayAfter + "T00:00:00");
          while (ns.getDay() === 0 || ns.getDay() === 6 || holidaySet.has(ns.toISOString().slice(0,10))) {
            ns = new Date(ns.getTime() + 86400000);
          }
          const newStart = ns.toISOString().slice(0,10);
          const dur = Math.max(1, durDays(sanitized.start, sanitized.end));
          let ne = new Date(ns.getTime());
          let added = 0;
          while (added < dur - 1) {
            ne = new Date(ne.getTime() + 86400000);
            if (ne.getDay() !== 0 && ne.getDay() !== 6 && !holidaySet.has(ne.toISOString().slice(0,10))) added++;
          }
          const newEnd = ne.toISOString().slice(0,10);
          if (newStart !== sanitized.start || newEnd !== sanitized.end) {
            newProjs = newProjs.map(proj => {
              if (proj.id !== sanitized.projectId) return proj;
              return {
                ...proj,
                deliverables: proj.deliverables.map(del => {
                  if (del.id === sanitized.id) return { ...del, start: newStart, end: newEnd };
                  return { ...del, subtasks: del.subtasks.map(s => s.id === sanitized.id ? { ...s, start: newStart, end: newEnd } : s) };
                }),
              };
            });
            newProjs = cascadeDates(newProjs, sanitized.id, newEnd, holidays);
          }
        }
      }
      return newProjs;
    });
  };

  const handleAddProject = (proj) => setProjects(p => [...p, proj]);

  const handleArchiveProject = (id) => {
    const proj = projects.find(p => p.id === id);
    if (proj) { setArchivedProjects(a => [...a, { ...proj, archivedAt: new Date().toISOString() }]); }
    setProjects(ps => ps.filter(p => p.id !== id));
  };
  const handleRestoreProject = (id) => {
    const proj = archivedProjects.find(p => p.id === id);
    if (proj) { const { archivedAt, ...rest } = proj; setProjects(ps => [...ps, rest]); }
    setArchivedProjects(a => a.filter(p => p.id !== id));
  };
  const handleDeleteProject = (id) => {
    setProjects(ps => ps.filter(p => p.id !== id));
    setArchivedProjects(a => a.filter(p => p.id !== id));
  };
  const handleRenameProject = (id, name, client) => {
    setProjects(ps => ps.map(p => p.id !== id ? p : { ...p, name, client }));
  };
  const handleSaveAsTemplate = (proj) => {
    const tpl = {
      id: "tpl_saved_" + Date.now(),
      name: proj.name + " (template)",
      icon: "📋",
      deliverables: proj.deliverables.map(d => ({
        title: d.title,
        subtasks: d.subtasks.map(s => s.title),
      })),
    };
    setSavedTemplates(t => [...t, tpl]);
    alert(`"${proj.name}" saved as a template!`);
  };

  const handleAddDeliverable = (projectId, del) => {
    setProjects(projs => projs.map(p => p.id !== projectId ? p : { ...p, deliverables: [...p.deliverables, del] }));
  };

  const handleAddSubtask = (projectId, deliverableId, sub) => {
    setProjects(projs => projs.map(p => p.id !== projectId ? p : {
      ...p,
      deliverables: p.deliverables.map(d => d.id !== deliverableId ? d : { ...d, subtasks: [...d.subtasks, sub] }),
    }));
  };

  const handleDeleteDeliverable = (projectId, deliverableId) => {
    setProjects(projs => projs.map(p => p.id !== projectId ? p : {
      ...p, deliverables: p.deliverables.filter(d => d.id !== deliverableId),
    }));
  };

  const handleDeleteSubtask = (projectId, deliverableId, subtaskId) => {
    setProjects(projs => projs.map(p => p.id !== projectId ? p : {
      ...p,
      deliverables: p.deliverables.map(d => d.id !== deliverableId ? d : {
        ...d, subtasks: d.subtasks.filter(s => s.id !== subtaskId),
      }),
    }));
  };

  const handleInsertSubtask = (projectId, deliverableId, afterSubtaskId, newSub) => {
    setProjects(projs => projs.map(p => p.id !== projectId ? p : {
      ...p,
      deliverables: p.deliverables.map(d => {
        if (d.id !== deliverableId) return d;
        const idx = afterSubtaskId ? d.subtasks.findIndex(s => s.id === afterSubtaskId) : -1;
        const updated = [...d.subtasks];
        updated.splice(idx + 1, 0, newSub);
        return { ...d, subtasks: updated };
      }),
    }));
  };

  const handleReorderSubtasks = (projectId, deliverableId, newOrder) => {
    setProjects(projs => projs.map(p => p.id !== projectId ? p : {
      ...p,
      deliverables: p.deliverables.map(d => d.id !== deliverableId ? d : { ...d, subtasks: newOrder }),
    }));
  };

  const handleMarkDone = (projectId, deliverableId, subtaskId) => {
    setProjects(projs => projs.map(proj => {
      if (proj.id !== projectId) return proj;
      return {
        ...proj,
        deliverables: proj.deliverables.map(del => {
          if (subtaskId) {
            // toggling a subtask
            if (del.id !== deliverableId) return del;
            return {
              ...del,
              subtasks: del.subtasks.map(s => s.id !== subtaskId ? s : {
                ...s,
                status: s.status === "Done" ? "In Progress" : "Done",
                progress: s.status === "Done" ? 0 : 100,
              }),
            };
          } else {
            // toggling a deliverable
            if (del.id !== deliverableId) return del;
            const next = del.status === "Done" ? "In Progress" : "Done";
            return {
              ...del,
              status: next,
              progress: next === "Done" ? 100 : del.progress,
              subtasks: next === "Done"
                ? del.subtasks.map(s => ({ ...s, status: "Done", progress: 100 }))
                : del.subtasks,
            };
          }
        }),
      };
    }));
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
    { id: "dashboard", label: "Dashboard", icon: "◈" },
    { id: "timeline",  label: "Timeline",  icon: "▬" },
    { id: "people",    label: "By Person", icon: "◎" },
    { id: "status",    label: "Status",    icon: "◉" },
    { id: "archived",  label: "Archive",   icon: "⊡" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6f8", color: "#111827", fontFamily: "Arial, Helvetica, sans-serif", display: "flex", flexDirection: "column", width: "100vw", overflowX: "hidden" }}>
      <style>{`
        
        * { box-sizing: border-box; margin: 0; padding: 0; } html, body, #root { width: 100%; max-width: 100vw; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #e8eaee; }
        ::-webkit-scrollbar-thumb { background: #c4c9d4; border-radius: 3px; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0); cursor: pointer; }
        input[type=range] { cursor: pointer; }
        select option { background: #ffffff; color: #1a1d23; }
        .add-btn:hover { opacity: 1 !important; }
      `}</style>

      {/* Nav */}
      <header style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", padding: "0 20px", display: "flex", alignItems: "center", height: 52, flexShrink: 0, background: "#f5f6f8", width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginRight: 36 }}>
          <div style={{ width: 26, height: 26, background: "#f59e0b", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: "#000", fontFamily: "Arial, Helvetica, sans-serif" }}>P</span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#111827", fontFamily: "Arial, Helvetica, sans-serif", letterSpacing: "-0.02em" }}>PLANR</span>
        </div>
        <nav style={{ display: "flex", gap: 3 }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{
              background: view === n.id ? "rgba(245,158,11,0.12)" : "none",
              border: `1px solid ${view === n.id ? "rgba(245,158,11,0.28)" : "transparent"}`,
              color: view === n.id ? "#d97706" : "#4b5563", padding: "5px 14px",
              borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.07em", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, transition: "all 0.12s",
            }}><span>{n.icon}</span>{n.label}</button>
          ))}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {/* ── SETTINGS MENU ── */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowSettingsMenu(m => !m)} style={{
              display: "flex", alignItems: "center", gap: 5,
              background: showSettingsMenu ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.12)", color: "#374151",
              borderRadius: 6, padding: "5px 13px", cursor: "pointer",
              fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", fontFamily: "inherit",
            }}>⚙ SETTINGS {showSettingsMenu ? "▲" : "▼"}</button>
            {showSettingsMenu && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 200,
                background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10,
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)", minWidth: 200, overflow: "hidden",
              }}>
                {[
                  { icon: "◎", label: "Team Members",   color: "#38bdf8", action: () => { setShowTeamSettings(true); setShowSettingsMenu(false); } },
                  { icon: "◧", label: "Templates",       color: "#a78bfa", action: () => { setShowTemplates(true); setShowSettingsMenu(false); } },
                  { icon: "↓", label: "Export to Excel", color: "#34d399", action: () => { exportToExcel(projects); setShowSettingsMenu(false); } },
                  { icon: "🗓", label: "Holidays",        color: "#fb923c", action: () => { setShowHolidays(true); setShowSettingsMenu(false); } },
                  { icon: "↑", label: "Import Excel",    color: "#34d399", action: () => { setShowImport(true); setShowSettingsMenu(false); } },
                  { icon: "⊡", label: "Archived Projects",color: "#fbbf24", action: () => { setView("archived"); setShowSettingsMenu(false); } },
                ].map(item => (
                  <button key={item.label} onClick={item.action} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 16px", background: "none", border: "none",
                    borderBottom: "1px solid rgba(0,0,0,0.05)", cursor: "pointer",
                    fontSize: 12, fontWeight: 600, color: "#1f2937", fontFamily: "inherit",
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
            background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.5)",
            color: "#d97706", borderRadius: 6, padding: "5px 13px", cursor: "pointer",
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
      <main style={{ flex: 1, padding: "14px 16px", overflow: "auto", display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box", width: "100%", minWidth: 0 }}>
        {/* Project pills */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          {projects.map(proj => {
            const total = proj.deliverables.flatMap(d => [d, ...d.subtasks]).length;
            return (
              <div key={proj.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px 5px 12px", background: proj.color + "10", border: `1px solid ${proj.color}28`, borderRadius: 16, fontSize: 11, color: proj.color, fontWeight: 700 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: proj.color, display: "inline-block" }} />
                {proj.name}
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

        {view === "dashboard" && <DashboardView projects={projects} people={people} onEditItem={handleEditItem} onAddDeliverable={(proj) => setNewDeliverable(proj)} onAddSubtask={(proj, del) => setNewSubtask({ project: proj, deliverable: del })} onNewProject={() => setShowNewProject(true)} />}
        {view === "timeline"  && (
          <TimelineView projects={projects} people={people} onEditItem={handleEditItem}
            onAddDeliverable={(proj) => setNewDeliverable(proj)}
            onAddSubtask={(proj, del) => setNewSubtask({ project: proj, deliverable: del })}
            onMarkDone={handleMarkDone} onSaveItem={handleSaveItem} holidays={holidays}
            onInsertSubtask={handleInsertSubtask}
            onReorderSubtasks={handleReorderSubtasks}
            onDeleteSubtask={handleDeleteSubtask}
          />
        )}
        {view === "people"  && <PeopleView projects={projects} people={people} onEditItem={handleEditItem} onMarkDone={handleMarkDone} onSaveItem={handleSaveItem} holidays={holidays} />}
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
                    <div key={d.id} style={{ fontSize: 11, color: "#6b7280", background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: "3px 10px" }}>{d.title}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {view === "status"  && <StatusView projects={projects} people={people} statusNotes={statusNotes} onUpdateNote={handleUpdateNote} onAddDeliverable={(proj) => setNewDeliverable(proj)} onAddSubtask={(proj, del) => setNewSubtask({ project: proj, deliverable: del })} onSaveTrackOverride={(projId, delId, val) => setProjects(ps => ps.map(p => p.id !== projId ? p : { ...p, deliverables: p.deliverables.map(d => d.id !== delId ? d : { ...d, trackOverride: val }) }))} onEditItem={handleEditItem} />}
      </main>

      {/* ── Modals ── */}
      {showHolidays && (
        <HolidaysModal holidays={holidays} onClose={() => setShowHolidays(false)} onSave={(newHolidays) => {
          setHolidays(newHolidays);
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
        <TeamSettingsModal people={people} onClose={() => setShowTeamSettings(false)} onSave={setPeople} />
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
        />
      )}
    </div>
  );
}
