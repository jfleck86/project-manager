import { useState, useRef, useEffect } from "react";

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

const STATUSES = [
  "Not Started",
  "In Progress",
  "Editorial Review",
  "Design Review",
  "Proof Review",
  "Internal Review",
  "Client Review",
  "Done",
  "Blocked",
];
const PRIORITIES   = ["Low", "Medium", "High", "Critical"];
const DEPARTMENTS  = ["Editorial", "Design", "Proof", "Strategy", "Account", "Production"];

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
  "Editorial Review": { color: "#f59e0b", bg: "rgba(245,158,11,0.15)"  },
  "Design Review":    { color: "#e879f9", bg: "rgba(232,121,249,0.15)" },
  "Proof Review":     { color: "#fb923c", bg: "rgba(251,146,60,0.15)"  },
  "Internal Review":  { color: "#818cf8", bg: "rgba(129,140,248,0.15)" },
  "Client Review":    { color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
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
function TaskModal({ item, projectColor, allItems, onClose, onSave, allPeople }) {
  const [form, setForm] = useState({ ...item });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const togglePerson = (id) => set("assignees", form.assignees.includes(id)
    ? form.assignees.filter(x => x !== id) : [...form.assignees, id]);
  const toggleDep = (id) => set("dependencies", (form.dependencies || []).includes(id)
    ? (form.dependencies || []).filter(x => x !== id) : [...(form.dependencies || []), id]);

  const duration = form.start && form.end ? durDays(form.start, form.end) : "—";

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
          {/* Dates + Duration */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.6fr", gap: 14 }}>
            {[["Start Date", "start"], ["End Date", "end"]].map(([label, key]) => (
              <div key={key}>
                <div style={labelStyle}>{label}</div>
                <input type="date" value={form[key]} onChange={e => set(key, e.target.value)} style={{ ...selectStyle, width: "100%" }} />
              </div>
            ))}
            <div>
              <div style={labelStyle}>Duration</div>
              <div style={{ ...selectStyle, background: "rgba(0,0,0,0.05)", color: "#4b5563", display: "flex", alignItems: "center" }}>
                {duration} {typeof duration === "number" ? "days" : ""}
              </div>
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
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", padding: "14px 22px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }} style={{ ...cancelBtnStyle, background: projectColor, color: "#000", border: "none", fontWeight: 700 }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
const labelStyle = { fontSize: 10, color: "#6b7280", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 6 };
const selectStyle = { width: "100%", background: "#f7f8fa", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 6, color: "#111827", padding: "7px 10px", fontFamily: "inherit", fontSize: 12, boxSizing: "border-box" };
const cancelBtnStyle = { background: "rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 6, color: "#4b5563", padding: "7px 16px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 };

// --- DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardView({ projects, people, onEditItem, onAddDeliverable, onAddSubtask }) {
  const allDeliverables = projects.flatMap(p => p.deliverables.map(d => ({ ...d, projectId: p.id, projectName: p.name, projectColor: p.color })));
  const allSubtasks = projects.flatMap(p => p.deliverables.flatMap(d => d.subtasks.map(s => ({ ...s, projectId: p.id, projectName: p.name, projectColor: p.color, deliverableId: d.id }))));
  const allItems = [...allDeliverables, ...allSubtasks];

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
      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {STATUSES.map(s => {
          const m = statusMeta[s] || statusMeta["Not Started"]; const c = statusCounts[s];
          return (
            <div key={s} style={{ background: "#ffffff", border: `1px solid ${m.color}28`, borderRadius: 10, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, width: `${Math.round((c/total)*100)}%`, height: 3, background: m.color }} />
              <div style={{ fontSize: 30, fontWeight: 900, color: m.color, lineHeight: 1 }}>{c}</div>
              <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4, fontWeight: 700, letterSpacing: "0.07em" }}>{s.toUpperCase()}</div>
            </div>
          );
        })}
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
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <SectionHeader noMargin>All Deliverables</SectionHeader>
          <div style={{ display: "flex", gap: 8 }}>
            {projects.map(proj => (
              <button key={proj.id} onClick={() => onAddDeliverable(proj)} style={{
                background: proj.color + "12", border: `1px solid ${proj.color}40`,
                color: proj.color, borderRadius: 5, padding: "4px 10px",
                cursor: "pointer", fontSize: 10, fontWeight: 800, fontFamily: "inherit",
              }}>+ {proj.name.length > 18 ? proj.name.slice(0,18)+"…" : proj.name}</button>
            ))}
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              {["Deliverable","Project","Status","Priority","Assignees","Start","End","Dur.","Progress",""].map((h, i) => (
                <th key={i} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.07em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allDeliverables.map(d => {
              const proj = projects.find(p => p.id === d.projectId);
              return (
                <tr key={d.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.025)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "11px 14px", fontSize: 12, fontWeight: 700, color: d.status === "Done" ? "#9ca3af" : "#1f2937", textDecoration: d.status === "Done" ? "line-through" : "none", cursor: "pointer" }} onClick={() => onEditItem(d)}>{d.title}</td>
                  <td style={{ padding: "11px 14px" }}><span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b7280" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: d.projectColor, display: "inline-block" }} />{d.projectName}</span></td>
                  <td style={{ padding: "11px 14px" }}><StatusBadge status={d.status} small /></td>
                  <td style={{ padding: "11px 14px" }}><PriorityDot priority={d.priority} /></td>
                  <td style={{ padding: "11px 14px" }}><div style={{ display: "flex" }}>{d.assignees.map(id => { const p = people.find(x => x.id === id); return p ? <div key={id} style={{ marginRight: -5 }}><Avatar person={p} size={22} /></div> : null; })}</div></td>
                  <td style={{ padding: "11px 14px", fontSize: 11, color: "#6b7280" }}>{fmt(parseDate(d.start))}</td>
                  <td style={{ padding: "11px 14px", fontSize: 11, color: "#6b7280" }}>{fmt(parseDate(d.end))}</td>
                  <td style={{ padding: "11px 14px", fontSize: 11, color: "#6b7280" }}>{durDays(d.start, d.end)}d</td>
                  <td style={{ padding: "11px 14px", width: 110 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <ProgressBar value={d.progress} color={d.projectColor} />
                      <span style={{ fontSize: 10, color: "#6b7280", minWidth: 26 }}>{d.progress}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                    <button onClick={() => onAddSubtask(proj, d)} style={{
                      background: "none", border: `1px solid rgba(0,0,0,0.12)`, borderRadius: 4,
                      color: "#6b7280", padding: "2px 8px", cursor: "pointer",
                      fontSize: 10, fontWeight: 700, fontFamily: "inherit",
                      transition: "all 0.12s",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = d.projectColor; e.currentTarget.style.color = d.projectColor; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; e.currentTarget.style.color = "#6b7280"; }}
                    >+ Subtask</button>
                  </td>
                </tr>
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
const DAY_W = 26;
const D_ROW = 44;
const S_ROW = 36;
const TODAY = new Date("2026-05-20");
const totalDays = Math.ceil((TIMELINE_END - TIMELINE_START) / 86400000);

// Column widths for the left table
const COL = { num: 36, title: 190, start: 88, end: 88, dur: 50, deps: 80, assignees: 80 };
const LEFT_W = Object.values(COL).reduce((a, b) => a + b, 0);

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

function dayOffset(dateStr) {
  return Math.ceil((parseDate(dateStr) - TIMELINE_START) / 86400000);
}

function TimelineView({ projects, people, onEditItem, onAddDeliverable, onAddSubtask, onMarkDone, onSaveItem }) {
  const [collapsed, setCollapsed] = useState({});
  const toggle = (id) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  const scrollRef = useRef(null);
  const rowIndex = buildRowIndex(projects);

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
    <div style={{ background: "#eceef2", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, overflow: "hidden", fontFamily: "inherit" }}>
      {/* Sticky header row — month labels */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#f5f6f8", position: "sticky", top: 0, zIndex: 20 }}>
        {/* Left table header */}
        <div style={{ width: LEFT_W, flexShrink: 0, display: "flex", borderRight: "1px solid rgba(0,0,0,0.07)" }}>
          {[["#", COL.num], ["Title", COL.title], ["Start", COL.start], ["End", COL.end], ["Dur", COL.dur], ["Deps", COL.deps], ["Assigned To", COL.assignees]].map(([h, w]) => (
            <div key={h} style={{ width: w, padding: "10px 10px", fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.09em", flexShrink: 0, borderRight: "1px solid rgba(0,0,0,0.05)", whiteSpace: "nowrap", overflow: "hidden" }}>{h.toUpperCase()}</div>
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
        projects={projects} people={people} collapsed={collapsed} toggle={toggle}
        weeks={weeks} todayOff={todayOff} allItemsFlat={allItemsFlat}
        onEditItem={onEditItem} headerScrollRef={scrollRef}
        onAddDeliverable={onAddDeliverable} onAddSubtask={onAddSubtask}
        onMarkDone={onMarkDone} onSaveItem={onSaveItem} rowIndex={rowIndex}
      />
    </div>
  );
}

function TimelineBody({ projects, people, collapsed, toggle, weeks, todayOff, allItemsFlat, onEditItem, headerScrollRef, onAddDeliverable, onAddSubtask, onMarkDone, onSaveItem, rowIndex }) {
  const bodyRef = useRef(null);

  const syncScroll = (e) => {
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = e.target.scrollLeft;
  };

  return (
    <div style={{ overflowX: "auto", overflowY: "visible" }} onScroll={syncScroll} ref={bodyRef}>
      <div style={{ minWidth: LEFT_W + totalDays * DAY_W }}>
        {projects.map(proj => (
          <ProjectSection key={proj.id} proj={proj} people={people} collapsed={collapsed} toggle={toggle}
            weeks={weeks} todayOff={todayOff} allItemsFlat={allItemsFlat} onEditItem={onEditItem}
            onAddDeliverable={onAddDeliverable} onAddSubtask={onAddSubtask} onMarkDone={onMarkDone}
            onSaveItem={onSaveItem} rowIndex={rowIndex} />
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

function ProjectSection({ proj, people, collapsed, toggle, weeks, todayOff, allItemsFlat, onEditItem, onAddDeliverable, onAddSubtask, onMarkDone, onSaveItem, rowIndex }) {
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
          onSaveItem={onSaveItem} rowIndex={rowIndex} />
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

function DeliverableRow({ del, proj, people, collapsed, toggle, weeks, todayOff, allItemsFlat, onEditItem, onAddSubtask, onMarkDone, onSaveItem, rowIndex }) {
  const isCollapsed = collapsed[del.id];
  const rowNum = rowIndex.index[del.id] || "?";
  const startOff = dayOffset(del.start);
  const endOff   = dayOffset(del.end);
  const barW = Math.max((endOff - startOff) * DAY_W, 8);

  const save = (patch) => onSaveItem({ ...del, projectId: proj.id, projectName: proj.name, projectColor: proj.color, ...patch });

  const depsDisplay = (del.depsText || "");
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
        <LeftCell width={COL.num} center>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af" }}>{rowNum}</span>
        </LeftCell>

        {/* Title */}
        <LeftCell width={COL.title}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <CheckButton isDone={del.status === "Done"} onClick={() => onMarkDone(proj.id, del.id, null)} />
            <button onClick={() => toggle(del.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 11, padding: 0, lineHeight: 1, flexShrink: 0 }}>
              {isCollapsed ? "▶" : "▼"}
            </button>
            <div style={{ width: 3, height: 14, background: proj.color, borderRadius: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: del.status === "Done" ? "#9ca3af" : "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textDecoration: del.status === "Done" ? "line-through" : "none" }} title={del.title}>{del.title}</span>
            <button onClick={onAddSubtask} title="Add subtask" style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 13, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = proj.color}
              onMouseLeave={e => e.currentTarget.style.color = "#9ca3af"}
            >+</button>
          </div>
          <StatusBadge status={del.status} small />
        </LeftCell>

        {/* Start */}
        <LeftCell width={COL.start}>
          <InlineDate value={del.start} onChange={v => save({ start: v })} />
        </LeftCell>

        {/* End */}
        <LeftCell width={COL.end}>
          <InlineDate value={del.end} onChange={v => save({ end: v })} />
        </LeftCell>

        {/* Duration (read-only, auto from dates) */}
        <LeftCell width={COL.dur}>
          <span style={{ fontSize: 10, color: "#6b7280", padding: "2px 3px" }}>{durDays(del.start, del.end)}d</span>
        </LeftCell>

        {/* Dependencies */}
        <LeftCell width={COL.deps}>
          <InlineDeps value={del.depsText || ""} onChange={v => save({ depsText: v })} />
        </LeftCell>

        {/* Assignees */}
        <LeftCell width={COL.assignees} last>
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

      {!isCollapsed && del.subtasks.map(sub => (
        <SubtaskRow key={sub.id} sub={sub} del={del} proj={proj} people={people}
          weeks={weeks} todayOff={todayOff} allItemsFlat={allItemsFlat} onEditItem={onEditItem}
          onMarkDone={onMarkDone} onSaveItem={onSaveItem} rowIndex={rowIndex} />
      ))}
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

function SubtaskRow({ sub, del, proj, people, weeks, todayOff, allItemsFlat, onEditItem, onMarkDone, onSaveItem, rowIndex }) {
  const m = statusMeta[sub.status] || statusMeta["Not Started"];
  const rowNum = rowIndex.index[sub.id] || "?";
  const startOff = dayOffset(sub.start);
  const endOff   = dayOffset(sub.end);
  const barW = Math.max((endOff - startOff) * DAY_W, 6);

  const save = (patch) => onSaveItem({ ...sub, projectId: proj.id, projectName: proj.name, projectColor: proj.color, deliverableId: del.id, ...patch });

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
      <LeftCell width={COL.num} center>
        <span style={{ fontSize: 9, color: "#9ca3af" }}>{rowNum}</span>
      </LeftCell>

      {/* Title */}
      <LeftCell width={COL.title}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 18 }}>
          <div style={{ width: 10, height: 1, background: "rgba(0,0,0,0.1)", flexShrink: 0 }} />
          <CheckButton isDone={sub.status === "Done"} onClick={() => onMarkDone(proj.id, del.id, sub.id)} />
          <span style={{ fontSize: 11, color: sub.status === "Done" ? "#9ca3af" : "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: sub.status === "Done" ? "line-through" : "none", flex: 1 }} title={sub.title}>{sub.title}</span>
        </div>
      </LeftCell>

      {/* Start */}
      <LeftCell width={COL.start}>
        <InlineDate value={sub.start} onChange={v => save({ start: v })} small />
      </LeftCell>

      {/* End */}
      <LeftCell width={COL.end}>
        <InlineDate value={sub.end} onChange={v => save({ end: v })} small />
      </LeftCell>

      {/* Duration */}
      <LeftCell width={COL.dur}>
        <span style={{ fontSize: 10, color: "#9ca3af", padding: "2px 3px" }}>{durDays(sub.start, sub.end)}d</span>
      </LeftCell>

      {/* Dependencies */}
      <LeftCell width={COL.deps}>
        <InlineDeps value={sub.depsText || ""} onChange={v => save({ depsText: v })} />
      </LeftCell>

      {/* Assignees */}
      <LeftCell width={COL.assignees} last>
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
  const toggle = (id) => onChange(assignees.includes(id) ? assignees.filter(x => x !== id) : [...assignees, id]);
  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
        {assignees.length === 0
          ? <span style={{ fontSize: 9, color: "#9ca3af", border: "1px dashed rgba(0,0,0,0.2)", borderRadius: 8, padding: "1px 5px", whiteSpace: "nowrap" }}>+ Assign</span>
          : assignees.slice(0, 3).map(id => { const p = people.find(x => x.id === id); return p ? <div key={id} style={{ marginRight: -5 }}><Avatar person={p} size={18} /></div> : null; })
        }
        {assignees.length > 3 && <span style={{ fontSize: 9, color: "#6b7280", marginLeft: 8 }}>+{assignees.length-3}</span>}
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100, background: "#fff",
          border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
          padding: 8, display: "flex", flexDirection: "column", gap: 3, minWidth: 150 }}>
          {people.map(p => (
            <div key={p.id} onClick={() => toggle(p.id)} style={{ display: "flex", alignItems: "center", gap: 8,
              padding: "4px 8px", borderRadius: 5, cursor: "pointer", userSelect: "none",
              background: assignees.includes(p.id) ? p.color + "15" : "transparent",
              border: "1px solid " + (assignees.includes(p.id) ? p.color + "60" : "transparent"),
            }}>
              <Avatar person={p} size={20} />
              <span style={{ fontSize: 11, color: "#1f2937", fontWeight: assignees.includes(p.id) ? 700 : 400, flex: 1 }}>{p.name}</span>
              {assignees.includes(p.id) && <span style={{ color: p.color, fontSize: 11 }}>✓</span>}
            </div>
          ))}
          <div onClick={() => setOpen(false)} style={{ borderTop: "1px solid rgba(0,0,0,0.07)", marginTop: 2, paddingTop: 4, textAlign: "center", fontSize: 10, color: "#9ca3af", cursor: "pointer" }}>Done</div>
        </div>
      )}
    </div>
  );
}

// --- PEOPLE VIEW ──────────────────────────────────────────────────────────────
function PeopleView({ projects, people, onEditItem, onMarkDone }) {
  const allDeliverables = projects.flatMap(p => p.deliverables.map(d => ({ ...d, projectId: p.id, projectName: p.name, projectColor: p.color })));
  const allSubtasks = projects.flatMap(p => p.deliverables.flatMap(d => d.subtasks.map(s => ({ ...s, projectId: p.id, projectName: p.name, projectColor: p.color, deliverableId: d.id }))));
  const allItems = [...allDeliverables, ...allSubtasks];
  const [selected, setSelected] = useState(people[0].id);

  const person = people.find(p => p.id === selected);
  const myItems = allItems.filter(t => t.assignees.includes(selected));
  const byStatus = STATUSES.reduce((a, s) => ({ ...a, [s]: myItems.filter(t => t.status === s) }), {});

  return (
    <div style={{ display: "flex", gap: 18 }}>
      <div style={{ width: 210, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {people.map(p => {
          const items = allItems.filter(t => t.assignees.includes(p.id));
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

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Person header */}
        <div style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 10, padding: "18px 22px", display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar person={person} size={50} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{person.name}</div>
            <div style={{ display: "flex", gap: 14, marginTop: 5 }}>
              {STATUSES.map(s => { const cnt = byStatus[s].length; if (!cnt) return null; const sm = statusMeta[s] || statusMeta["Not Started"]; return <span key={s} style={{ fontSize: 11, color: sm.color, fontWeight: 700 }}>{cnt} {s}</span>; })}
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: person.color }}>{myItems.length}</div>
            <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: "0.07em" }}>TOTAL TASKS</div>
          </div>
        </div>

        {/* Active columns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
          {["In Progress","Editorial Review","Design Review","Proof Review","Internal Review","Client Review","Blocked"].map(s => {
            const items = byStatus[s]; const m = statusMeta[s] || statusMeta["Not Started"];
            return (
              <div key={s} style={{ background: "#ffffff", border: `1px solid ${m.color}22`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: `1px solid ${m.color}18`, display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: m.color }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: m.color, letterSpacing: "0.04em" }}>{s}</span>
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
          const items = byStatus[s]; if (!items.length) return null; const m = statusMeta[s] || statusMeta["Not Started"];
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
                    border: "1px solid rgba(0,0,0,0.06)", borderLeft: `3px solid ${item.projectColor}`,
                    padding: 9, cursor: "pointer",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: s === "Done" ? 400 : 600, color: s === "Done" ? "#9ca3af" : "#1f2937" }}>{item.title}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{item.projectName}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
  if (del.status === "Editorial Review") return "editorial-review";
  if (del.status === "Design Review")    return "design-review";
  if (del.status === "Proof Review")     return "proof-review";
  if (del.status === "Internal Review")  return "on-track";
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
  "editorial-review":{ label: "Editorial Review", color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: "✍" },
  "design-review":   { label: "Design Review",    color: "#e879f9", bg: "rgba(232,121,249,0.12)", icon: "◈" },
  "proof-review":    { label: "Proof Review",     color: "#fb923c", bg: "rgba(251,146,60,0.12)",  icon: "◉" },
  "client-review":   { label: "Client Review",    color: "#a78bfa", bg: "rgba(167,139,250,0.12)", icon: "◎" },
  "blocked":         { label: "Blocked",          color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: "⊘" },
  "done":            { label: "Complete",         color: "#6b7280", bg: "rgba(71,85,105,0.12)",   icon: "✓" },
};

function getCurrentTask(del) {
  // First in-progress subtask, else first not-started, else the deliverable itself
  const active = del.subtasks.find(s => s.status === "In Progress");
  if (active) return active.title;
  const next = del.subtasks.find(s => s.status === "Not Started");
  if (next) return next.title;
  if (del.status !== "Done") return del.title;
  return "Complete";
}

function StatusView({ projects, people, statusNotes, onUpdateNote, onAddDeliverable, onAddSubtask }) {
  const [editingNote, setEditingNote] = useState(null); // { projId, delId }
  const [noteText, setNoteText] = useState("");
  const [filterProj, setFilterProj] = useState("all");
  const [filterTrack, setFilterTrack] = useState("all");

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

  const filtered = rows.filter(r =>
    (filterProj === "all" || r.proj.id === filterProj) &&
    (filterTrack === "all" || r.track === filterTrack)
  );

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
        {/* project filter */}
        <div style={{ marginLeft: "auto" }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "130px 170px 190px 190px 100px 110px 120px 1fr 90px", gap: 0, borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#eceef2" }}>
          {["Client","Project","Deliverable","Current Task","Track","Dept","Assigned To","Status Notes / Next Steps",""].map((h, i) => (
            <div key={h} style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.08em", textTransform: "uppercase", borderRight: i < 6 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>{h}</div>
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
              display: "grid", gridTemplateColumns: "130px 170px 190px 190px 100px 110px 120px 1fr 90px",
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

              {/* Deliverable */}
              <Cell border>
                <span style={{ fontSize: 12, fontWeight: 700, color: isDone ? "#9ca3af" : "#111827", textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{del.title}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <div style={{ flex: 1, height: 3, background: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${del.progress}%`, height: "100%", background: proj.color, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 9, color: "#6b7280", flexShrink: 0 }}>{del.progress}%</span>
                </div>
              </Cell>

              {/* Current Task */}
              <Cell border>
                <span style={{ fontSize: 11, color: isDone ? "#9ca3af" : "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {isDone ? "✓ Complete" : currentTask}
                </span>
                {!isDone && (
                  <span style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>
                    Due {fmt(parseDate(del.end))}
                  </span>
                )}
              </Cell>

              {/* Track */}
              <Cell border>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: m.bg, color: m.color,
                  border: `1px solid ${m.color}40`,
                  borderRadius: 4, padding: "3px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
                }}>
                  {m.icon} {m.label}
                </span>
              </Cell>

              {/* Department */}
              <Cell border>
                {del.department
                  ? <DeptBadge dept={del.department} />
                  : <span style={{ fontSize: 10, color: "#9ca3af" }}>—</span>
                }
              </Cell>

              {/* Assigned To */}
              <Cell border>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ display: "flex" }}>
                    {del.assignees.slice(0, 3).map(id => {
                      const p = people.find(x => x.id === id);
                      return p ? <div key={id} style={{ marginRight: -5 }}><Avatar person={p} size={20} /></div> : null;
                    })}
                  </div>
                  <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{assigneeNames || "—"}</span>
                </div>
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
function ProjectMenu({ proj, onClose, onArchive, onDelete, onRename }) {
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
function NewDeliverableModal({ project, onClose, onAdd, allPeople }) {
  const today = "2026-05-20";
  const weekOut = "2026-05-27";
  const [form, setForm] = useState({
    title: "", status: "Not Started", priority: "Medium",
    assignees: [], start: today, end: weekOut, progress: 0, dependencies: [], department: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const togglePerson = (id) => set("assignees", form.assignees.includes(id) ? form.assignees.filter(x => x !== id) : [...form.assignees, id]);
  const [error, setError] = useState("");

  const handleAdd = () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    const id = "d_" + Date.now();
    onAdd(project.id, { ...form, id, title: form.title.trim(), subtasks: [] });
    onClose();
  };

  const duration = form.start && form.end ? durDays(form.start, form.end) : "—";

  return (
    <Overlay onClose={onClose}>
      <ModalShell title={<span>New Deliverable <span style={{ color: project.color, fontWeight: 400 }}>— {project.name}</span></span>} onClose={onClose} accentColor={project.color} width={540}>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
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
        <ModalFooter onClose={onClose} onSave={handleAdd} saveLabel="Add Deliverable" color={project.color} />
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

  const handleAdd = () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    const id = "s_" + Date.now();
    onAdd(project.id, deliverable.id, { ...form, id, title: form.title.trim() });
    onClose();
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
        <ModalFooter onClose={onClose} onSave={handleAdd} saveLabel="Add Subtask" color={project.color} />
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
  const [projectMenu, setProjectMenu] = useState(null); // proj object
  const [showArchived, setShowArchived] = useState(false);
  const [statusNotes, setStatusNotes] = useState({});
  const handleUpdateNote = (key, text) => setStatusNotes(n => ({ ...n, [key]: text }));
  const [newDeliverable, setNewDeliverable] = useState(null); // project object
  const [newSubtask, setNewSubtask] = useState(null);         // { project, deliverable }

  // ── handlers ──
  const handleEditItem = (item) => setEditingItem(item);

  const handleSaveItem = (updated) => {
    setProjects(projs => projs.map(proj => {
      if (proj.id !== updated.projectId) return proj;
      return {
        ...proj,
        deliverables: proj.deliverables.map(del => {
          if (del.id === updated.id) return { ...del, ...updated };
          return { ...del, subtasks: del.subtasks.map(s => s.id === updated.id ? { ...s, ...updated } : s) };
        }),
      };
    }));
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

  const handleAddDeliverable = (projectId, del) => {
    setProjects(projs => projs.map(p => p.id !== projectId ? p : { ...p, deliverables: [...p.deliverables, del] }));
  };

  const handleAddSubtask = (projectId, deliverableId, sub) => {
    setProjects(projs => projs.map(p => p.id !== projectId ? p : {
      ...p,
      deliverables: p.deliverables.map(d => d.id !== deliverableId ? d : { ...d, subtasks: [...d.subtasks, sub] }),
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
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6f8", color: "#111827", fontFamily: "Arial, Helvetica, sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #e8eaee; }
        ::-webkit-scrollbar-thumb { background: #c4c9d4; border-radius: 3px; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0); cursor: pointer; }
        input[type=range] { cursor: pointer; }
        select option { background: #ffffff; color: #1a1d23; }
        .add-btn:hover { opacity: 1 !important; }
      `}</style>

      {/* Nav */}
      <header style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", padding: "0 24px", display: "flex", alignItems: "center", height: 52, flexShrink: 0, background: "#f5f6f8" }}>
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
          {/* ── TEAM BUTTON ── */}
          <button onClick={() => setShowTeamSettings(true)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.4)",
            color: "#38bdf8", borderRadius: 6, padding: "5px 13px", cursor: "pointer",
            fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", fontFamily: "inherit",
          }}>
            <span style={{ fontSize: 13 }}>◎</span> TEAM
          </button>
          {/* ── IMPORT BUTTON ── */}
          <button onClick={() => setShowImport(true)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.4)",
            color: "#34d399", borderRadius: 6, padding: "5px 13px", cursor: "pointer",
            fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", fontFamily: "inherit",
            transition: "all 0.12s",
          }}>
            <span style={{ fontSize: 13 }}>↑</span> IMPORT EXCEL
          </button>
          {/* ── NEW PROJECT BUTTON ── */}
          <button onClick={() => setShowNewProject(true)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.5)",
            color: "#f59e0b", borderRadius: 6, padding: "5px 13px", cursor: "pointer",
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
      <main style={{ flex: 1, padding: 20, overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
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

        {view === "dashboard" && <DashboardView projects={projects} people={people} onEditItem={handleEditItem} onAddDeliverable={(proj) => setNewDeliverable(proj)} onAddSubtask={(proj, del) => setNewSubtask({ project: proj, deliverable: del })} />}
        {view === "timeline"  && (
          <TimelineView projects={projects} people={people} onEditItem={handleEditItem}
            onAddDeliverable={(proj) => setNewDeliverable(proj)}
            onAddSubtask={(proj, del) => setNewSubtask({ project: proj, deliverable: del })}
            onMarkDone={handleMarkDone} onSaveItem={handleSaveItem}
          />
        )}
        {view === "people"  && <PeopleView projects={projects} people={people} onEditItem={handleEditItem} onMarkDone={handleMarkDone} />}
        {view === "status"  && <StatusView projects={projects} people={people} statusNotes={statusNotes} onUpdateNote={handleUpdateNote} onAddDeliverable={(proj) => setNewDeliverable(proj)} onAddSubtask={(proj, del) => setNewSubtask({ project: proj, deliverable: del })} />}
      </main>

      {/* ── Modals ── */}
      {showTeamSettings && (
        <TeamSettingsModal
          people={people}
          onClose={() => setShowTeamSettings(false)}
          onSave={setPeople}
        />
      )}
      {projectMenu && (
        <ProjectMenu
          proj={projectMenu}
          onClose={() => setProjectMenu(null)}
          onArchive={handleArchiveProject}
          onDelete={handleDeleteProject}
          onRename={handleRenameProject}
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
          onClose={() => setEditingItem(null)}
          onSave={handleSaveItem}
        />
      )}
    </div>
  );
}