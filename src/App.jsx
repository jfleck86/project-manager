// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BRAND_TEAL, BRAND_NAVY, BRAND_TEAL_D, BRAND_TEAL_L } from "./constants/brand.js";
import { STATUSES, statusMeta } from "./constants/statuses.js";
import { PRIORITIES, priorityMeta, DEPARTMENTS, deptMeta } from "./constants/priorities.js";
import { EFFORT_OPTS, EFFORT_LABEL, EFFORT_HOURS, EFFORT_VAL, WEEKLY_HOURS, HOURS_LIGHT, HOURS_MEDIUM } from "./constants/effort.js";
import { TIMELINE_START, TIMELINE_END } from "./constants/timeline.js";
import { MIN_DAY_W, MAX_DAY_W, D_ROW, S_ROW, COL_DEFAULTS } from "./constants/columns.js";
import { PROJECT_COLORS } from "./constants/colors.js";
import { getReadyTasks, buildReadyNotifications } from "./lib/workflowEngine.js";
import { parseDate, fmt, durDays, dayOffset, busyDays, addWorkingDays } from "./utils/dates.js";
import { effortHours, classifyLoad, ptoDaysInWeek, availableHours } from "./utils/workload.js";
import { getInitials } from "./utils/formatting.js";
import { rowToSubtask, rowToDeliverable, rowToProject, delToRow, subToRow, ptoToRow, rowToPto, isOnPto, ptoOverlap } from "./lib/dataConverters.js";
import { signOut, getStoredSession, fetchAppUser, refreshSession } from "./lib/supabaseAuth.js";
import LoginScreen from "./components/LoginScreen.jsx";

const MEMBER_COLORS = ["#f59e0b","#38bdf8","#a78bfa","#34d399","#f87171","#fb923c","#e879f9","#4ade80","#60a5fa","#facc15","#64748b"];
const ZOOM_LEVELS = [
  { id: "compact",  label: "Compact",    base: 11, scale: 0.85 },
  { id: "standard", label: "Standard",   base: 13, scale: 1.00 },
  { id: "large",    label: "Large",      base: 15, scale: 1.15 },
  { id: "xl",       label: "Extra Large",base: 17, scale: 1.30 },
];
let _zoomRatio = 1.0;
const fs = (px) => Math.round(px * _zoomRatio);
const totalDays = Math.ceil((TIMELINE_END - TIMELINE_START) / 86400000);
const TODAY = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
function cloneSubtask(sub) { return { ...sub, id: "s_" + Date.now() + "_" + Math.random().toString(36).slice(2,6) }; }
// Custom effort wrapper — handles "C" (custom hours) in addition to S/M/L
const effortHrs = (effort, customHours) => {
  try {
    if (!effort || effort === "C") return Math.max(0.5, parseFloat(customHours) || 1);
    return effortHours(effort) || 1;
  } catch { return 1; }
};

// Effort-weighted deliverable progress (0-100).
// Done = 100% of effort, In Progress = 50%, anything else = 0%.
// Falls back to del.progress if no subtasks exist.
function delProgress(del) {
  const subs = del.subtasks || [];
  if (subs.length === 0) {
    return del.status === "Done" ? 100 : (del.progress || 0);
  }
  let total = 0, completed = 0;
  subs.forEach(s => {
    const hrs = effortHrs(s.effort, s.customHours);
    total += hrs;
    if (s.status === "Done")        completed += hrs;
    else if (s.status === "In Progress") completed += hrs * 0.5;
  });
  if (total === 0) return del.status === "Done" ? 100 : 0;
  return Math.round((completed / total) * 100);
}
function cloneDeliverable(del) {
  const newId = "d_" + Date.now() + "_" + Math.random().toString(36).slice(2,6);
  return { ...del, id: newId, title: del.title + " (copy)", dependencies: [], subtasks: del.subtasks.map(s => cloneSubtask({ ...s, dependencies: [] })) };
}

const initialPeople = [
  { id: "p1", name: "Maya Chen",     color: "#f59e0b" },
  { id: "p2", name: "Jordan Rivers", color: "#38bdf8" },
  { id: "p3", name: "Sam Torres",    color: "#a78bfa" },
  { id: "p4", name: "Riley Park",    color: "#34d399" },
  { id: "p5", name: "Alex Kim",      color: "#f87171" },
];

// Font-size scaler — multiply any px size by the zoom ratio
// zoomRatio is set inside App() based on selected zoom level



// Workload classification (hours-based, hidden from users)

// Count PTO business days in a week (Mon–Fri)

// Available hours for a person in a week (accounts for PTO + holidays)

// --- DATA - deliverables = specific outputs; subtasks = production workflow steps
const initialProjects = [
  {
    id: "proj1", name: "DPP TPL Relaunch", color: "#f59e0b", client: "DPP",
    deliverables: [
      {
        id: "d_2", title: "Kickoff", status: "Not Started", priority: "Medium",
        assignees: ["p1"], start: "2026-05-19", end: "2026-06-30", progress: 0, dependencies: [], department: "",
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
            id: "s_5", title: "Copy Development", status: "In Progress", priority: "Medium",
            assignees: ["p1"], start: "2026-05-20", end: "2026-05-22", progress: 0, dependencies: [], department: "",
          },
          {
            id: "s_6", title: "Internal Review/Proof", status: "Not Started", priority: "Medium",
            assignees: ["p1"], start: "2026-05-25", end: "2026-06-20", progress: 0, dependencies: [], department: "",
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

// Business days between two date strings (inclusive), skipping weekends + provided holidays


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
    projectNumber:  proj.projectNumber || "",
    ownerId:        proj.ownerId || "",
    teamMemberIds:  proj.teamMemberIds || [],
    notes:          proj.notes || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [fromTemplate, setFromTemplate] = useState(null); // selected deliverable template
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

          {/* Project Number */}
          <div>
            <label style={labelStyle}>Project Number
              <span style={{ fontSize:9, fontWeight:400, color:"#9ca3af", marginLeft:6, textTransform:"none", letterSpacing:0 }}>
                Used in time allocation reports &amp; financial exports
              </span>
            </label>
            <input value={form.projectNumber} onChange={e => set("projectNumber", e.target.value)}
              placeholder="e.g. 23-041" style={inputStyle} />
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

  // Local style constants (also defined in NewProjectModal — kept separate for scope safety)
  const labelStyle  = { fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 5, display: "block" };
  const inputStyle  = { width: "100%", fontSize: 12, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 7, padding: "7px 10px", fontFamily: "inherit", background: "#fff", outline: "none", boxSizing: "border-box" };
  const selectStyle = { width: "100%", background: "#f7f8fa", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 6, color: "#111827", padding: "7px 10px", fontFamily: "inherit", fontSize: 12, boxSizing: "border-box" };
  const togglePerson = (id) => {
    const adding = !form.assignees.includes(id);
    const newAssignees = adding
      ? [...form.assignees, id]
      : form.assignees.filter(x => x !== id);
    set("assignees", newAssignees);
    // Auto-populate department from first-added assignee (if not already set)
    if (adding && !form.department && !form._deptManualOverride) {
      const person = (allPeople || people || []).find(p => p.id === id);
      // Account role spans multiple work types — don't auto-populate dept for them
      if (person?.department && person.department !== "Account") set("department", person.department);
    }
  };
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
              <select value={form.department || ""} onChange={e => { set("department", e.target.value); set("_deptManualOverride", true); }} style={selectStyle}>
                <option value="">— None —</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Effort</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[...EFFORT_OPTS, "C"].map(e => (
                  <button key={e} onClick={() => { set("effort", e); if (e !== "C") set("customHours", null); }} style={{
                    flex: 1, minWidth: 44, padding: "6px 0", borderRadius: 6, cursor: "pointer",
                    fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                    border: `1.5px solid ${form.effort === e ? projectColor : "rgba(0,0,0,0.12)"}`,
                    background: form.effort === e ? projectColor + "15" : "transparent",
                    color: form.effort === e ? projectColor : "#6b7280",
                  }}>
                    {e === "C" ? "Custom" : EFFORT_LABEL[e]}
                  </button>
                ))}
              </div>
              {form.effort === "C" && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number" min="0.5" max="200" step="0.5"
                    value={form.customHours ?? 1}
                    onChange={e => set("customHours", parseFloat(e.target.value) || 1)}
                    style={{ ...inputStyle, width: 80 }}
                  />
                  <span style={{ fontSize: 11, color: "#6b7280" }}>hours</span>
                </div>
              )}
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
            <button onClick={() => {
            // Strip internal tracking flag before saving
            const { _deptManualOverride, ...saveForm } = form;
            onSave(saveForm); onClose();
          }} style={{ ...cancelBtnStyle, background: projectColor, color: "#000", border: "none", fontWeight: 700 }}>Save Changes</button>
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

        {/* ── Overdue & Due Today ── */}
        {(() => {
          const todayD = new Date().toLocaleDateString("en-CA");
          const allTasks = projects.flatMap(proj =>
            proj.deliverables.flatMap(del => [
              ...del.subtasks.filter(s => s.end && s.status !== "Done").map(s => ({
                id: s.id, title: s.title, end: s.end,
                client: proj.client || "—", projName: proj.name, projColor: proj.color,
                delTitle: del.title,
              })),
              ...(del.subtasks.length === 0 && del.end && del.status !== "Done" ? [{
                id: del.id, title: del.title, end: del.end,
                client: proj.client || "—", projName: proj.name, projColor: proj.color,
                delTitle: null,
              }] : []),
            ])
          );
          const overdue  = allTasks.filter(t => t.end < todayD).sort((a,b) => a.end.localeCompare(b.end));
          const dueToday = allTasks.filter(t => t.end === todayD);
          const total = overdue.length + dueToday.length;
          const Row = ({ t, accent }) => (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0 8px 10px", borderBottom: "1px solid rgba(0,0,0,0.04)", borderLeft: `3px solid ${accent}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2, display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center" }}>
                  <span style={{ color: t.projColor, fontWeight: 700 }}>{t.client}</span>
                  <span style={{ color: "#d1d5db" }}>·</span>
                  <span>{t.projName}</span>
                  {t.delTitle && <><span style={{ color: "#d1d5db" }}>·</span><span style={{ color: "#9ca3af" }}>{t.delTitle}</span></>}
                </div>
              </div>
              <div style={{ fontSize: 9, color: accent, fontWeight: 700, flexShrink: 0, textAlign: "right" }}>
                {t.end === todayD ? "Today" : (() => { const d = Math.ceil((new Date(todayD+"T00:00:00") - new Date(t.end+"T00:00:00"))/86400000); return `${d}d ago`; })()}
              </div>
            </div>
          );
          return (
            <div style={{ background: "#fff", border: `1px solid ${total > 0 ? "rgba(239,68,68,0.2)" : "rgba(0,0,0,0.07)"}`, borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <SectionHeader noMargin>Overdue &amp; Due Today</SectionHeader>
                {total > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: 10, padding: "2px 8px" }}>{total}</span>}
              </div>
              {total === 0 ? (
                <div style={{ fontSize: 11, color: "#9ca3af" }}>🎉 Nothing overdue or due today.</div>
              ) : (
                <div>
                  {dueToday.length > 0 && <>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#f97316", letterSpacing: "0.08em", marginBottom: 4, textTransform: "uppercase" }}>Due Today · {dueToday.length}</div>
                    {dueToday.map(t => <Row key={t.id} t={t} accent="#f97316" />)}
                  </>}
                  {overdue.length > 0 && <>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#ef4444", letterSpacing: "0.08em", margin: `${dueToday.length > 0 ? "10px" : "0"} 0 4px`, textTransform: "uppercase" }}>Overdue · {overdue.length}</div>
                    {overdue.map(t => <Row key={t.id} t={t} accent="#ef4444" />)}
                  </>}
                </div>
              )}
            </div>
          );
        })()}

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
                        <ProgressBar value={delProgress(d)} color={d.projectColor} />
                        <span style={{ fontSize: 10, color: "#6b7280", minWidth: 26 }}>{delProgress(d)}%</span>
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

// Column widths for the left table
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

  // Build week markers — find first Monday on or before TIMELINE_START
  const getMonday = (d) => {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const m = new Date(d); m.setDate(d.getDate() + diff); m.setHours(0,0,0,0); return m;
  };
  const weekStarts = [];
  let wCur = getMonday(new Date(TIMELINE_START));
  while (wCur < TIMELINE_END) {
    weekStarts.push(new Date(wCur));
    wCur = new Date(wCur.getTime() + 7 * 86400000);
  }
  // weeks = day offsets (for grid lines), weekLabels = { offset, label } for header
  const weeks = weekStarts.map(w => Math.ceil((w - TIMELINE_START) / 86400000));
  const weekHeaders = weekStarts.map(w => ({
    offset: Math.max(0, Math.ceil((w - TIMELINE_START) / 86400000)),
    label: w.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));
  const todayOff = Math.ceil((TODAY - TIMELINE_START) / 86400000);

  // Scroll to left edge on mount (show project columns first)
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollLeft = 0;
  }, []);

  // ── Pan-drag: attach to the actual scroll container (containerRef) ────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const SKIP = new Set(["INPUT","TEXTAREA","SELECT","BUTTON","A"]);
    let active = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (SKIP.has(e.target.tagName)) return;
      if (e.target.closest("input,textarea,select,button,a,[data-no-pan]")) return;
      active = true;
      startX = e.clientX; startLeft = el.scrollLeft;
      startY = e.clientY; startTop  = el.scrollTop;
    };
    const onMouseMove = (e) => {
      if (!active) return;
      const dx = startX - e.clientX;
      const dy = startY - e.clientY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) el.style.cursor = "grabbing";
      el.scrollLeft = startLeft + dx;
      el.scrollTop  = startTop  + dy;
    };
    const onMouseUp = () => {
      if (active) el.style.cursor = "";
      active = false;
    };

    el.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
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
        onWheel={(e) => { if (e.shiftKey) { e.preventDefault(); containerRef.current.scrollLeft += e.deltaY || e.deltaX; } }}
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
          {/* Right: weekly Monday date labels */}
          <div style={{ flex: 1, position: "relative", height: "100%", width: totalDays * DAY_W }}>
            {weekHeaders.map((wh, i) => (
              <div key={i} style={{
                position: "absolute", left: wh.offset * DAY_W, width: 7 * DAY_W,
                height: "100%", display: "flex", alignItems: "center", paddingLeft: 5,
                fontSize: 10, fontWeight: 700, color: "#6b7280",
                borderLeft: "1px solid rgba(0,0,0,0.07)", whiteSpace: "nowrap",
              }}>{wh.label}</div>
            ))}
            {/* Today marker — teal dot in header */}
            <div style={{ position: "absolute", left: todayOff * DAY_W - 1, top: "20%", bottom: "20%", width: 3, background: BRAND_TEAL, borderRadius: 2, opacity: 0.9 }} />
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
  // syncScroll removed — single scroll container handles both header and body





  return (
    <div
      data-timeline-body="1"
      ref={bodyRef}
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
    ? Math.round(proj.deliverables.reduce((s, d) => s + delProgress(d), 0) / proj.deliverables.length)
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
            {/* Auto-derive display status from subtasks if not overridden */}
            {del.status === "Not Started" && del.subtasks?.some(s => s.status === "Done" || s.status === "In Progress") && (
              <span style={{ fontSize: fs(9), color: "#0ea5e9", fontWeight: 700, background: "rgba(14,165,233,0.1)", borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap" }}>In Progress</span>
            )}
            {del.status === "Not Started" && !del.subtasks?.some(s => s.status === "Done" || s.status === "In Progress") && (
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
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${delProgress(del)}%`, background: "rgba(0,0,0,0.2)", borderRadius: 5 }} />
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
      const popW = 220;
      const popH = Math.min(people.length * 44 + 60, window.innerHeight - 40);
      // Vertical: prefer below, flip above if no room
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      let top = spaceBelow >= popH ? rect.bottom + 4 : Math.max(8, rect.top - popH - 4);
      // Clamp vertical to viewport
      top = Math.max(8, Math.min(top, window.innerHeight - popH - 8));
      // Horizontal: prefer left-align with trigger, clamp right edge
      let left = rect.left;
      if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
      if (left < 8) left = 8;
      setPopPos({ top, left, maxH: popH });
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
            maxHeight: popPos.maxH || 400, overflowY: "auto",
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

function PersonPanel({ person, compact = false, allActive, projects, collapsed, loadBadge, GDAY_W, G_ROW, pto, holidays, holidaySet, calStart, onEditItem, onSaveItem, toggleCollapse, onTimelineReview }) {
  const [sortMode, setSortMode] = useState("default"); // "default" | "duedate"
  const myItemsRaw = allActive.filter(t => (t.assignees||[]).includes(person.id)).map(t => {
    if (t.deliverableId) {
      const proj = projects.find(p => p.id === t.projectId);
      const del  = proj?.deliverables.find(d => d.id === t.deliverableId);
      return { ...t, delTitle: del?.title || "" };
    }
    return t;
  });
  const myItems = sortMode === "duedate"
    ? [...myItemsRaw].sort((a,b) => {
        if (!a.end) return 1; if (!b.end) return -1;
        return a.end.localeCompare(b.end);
      })
    : myItemsRaw;
  const byStatus  = STATUSES.reduce((a,s) => ({ ...a, [s]: myItems.filter(t=>t.status===s) }), {});
  const isCollapsed = collapsed[person.id];
  const load = loadBadge(myItems);

  // Gantt date range — gStart is ALWAYS calAnchor so every panel starts on the same Sunday.
  // Tasks that started before calAnchor render with a clamped left edge (bar truncated at 0).
  const myDates   = myItems.flatMap(t => [t.start, t.end]).filter(Boolean).sort();
  const calAnchor = calStart instanceof Date ? calStart : (() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay()); return d; })();
  const gStart    = calAnchor; // all panels locked to the same Sunday
  const latestDate = myDates.length ? new Date(myDates[myDates.length-1]+"T00:00:00") : new Date(calAnchor.getTime()+84*86400000);
  const gEnd       = new Date(Math.max(latestDate.getTime(), calAnchor.getTime() + 56*86400000));
  const ganttDays  = Math.ceil((gEnd - gStart)/86400000) + 7;
  const gOff = (ds) => Math.ceil((parseDate(ds) - gStart) / 86400000);

  // scrollRef: no longer needed for auto-scroll (gStart IS calAnchor so offset is always 0)
  const scrollRef = React.useRef(null);
  React.useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, [calAnchor.toISOString().slice(0,10), person.id]);

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
      // Check if new end exceeds deliverable end date
      const parentDel = projects?.flatMap(p => p.deliverables).find(dd => dd.id === item.deliverableId);
      const delEnd = parentDel?.end;
      if (delEnd && ne > delEnd && onTimelineReview) {
        const daysPast = Math.ceil((new Date(ne+"T00:00:00") - new Date(delEnd+"T00:00:00")) / 86400000);
        onTimelineReview({ item, newEnd: ne, delEnd, daysPast, pendingSave: () => onSaveItem({ ...item, start: ns, end: ne }) });
      } else {
        onSaveItem({ ...item, start: ns, end: ne });
      }
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
              <div style={{ padding: "8px 14px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.07em" }}>
                  SCHEDULE OVERVIEW <span style={{ fontWeight: 400, color: "#c4c9d4" }}>· drag bars to reschedule</span>
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  {[["default","Default"],["duedate","By Due Date"]].map(([m,l]) => (
                    <button key={m} onClick={() => setSortMode(m)} style={{
                      fontSize: 9, fontWeight: sortMode===m ? 700 : 500, padding: "2px 8px",
                      borderRadius: 4, border: `1px solid ${sortMode===m ? BRAND_TEAL+"80" : "rgba(0,0,0,0.1)"}`,
                      background: sortMode===m ? BRAND_TEAL_L : "transparent",
                      color: sortMode===m ? BRAND_TEAL_D : "#9ca3af", cursor: "pointer", fontFamily: "inherit",
                    }}>{l}</button>
                  ))}
                </div>
              </div>
              {/* ── Split gantt: frozen labels | scrollable dates ── */}
              <div style={{ display:"flex", overflow:"hidden" }}>

                {/* Frozen left columns — CLIENT / DELIVERABLE / TASK */}
                <div style={{ flexShrink:0, width:420, borderRight:"2px solid rgba(0,0,0,0.07)", zIndex:2, background:"#fff" }}>
                  {/* Header */}
                  <div style={{ display:"flex", height:26, background:"#f7f8fa", borderBottom:"1px solid rgba(0,0,0,0.06)" }}>
                    <div style={{ width:80, padding:"0 10px", fontSize:9, fontWeight:700, color:"#9ca3af", letterSpacing:"0.07em", display:"flex", alignItems:"center", borderRight:"1px solid rgba(0,0,0,0.05)" }}>CLIENT</div>
                    <div style={{ width:180, padding:"0 10px", fontSize:9, fontWeight:700, color:"#9ca3af", letterSpacing:"0.07em", display:"flex", alignItems:"center", borderRight:"1px solid rgba(0,0,0,0.05)" }}>DELIVERABLE</div>
                    <div style={{ width:160, padding:"0 10px", fontSize:9, fontWeight:700, color:"#9ca3af", letterSpacing:"0.07em", display:"flex", alignItems:"center" }}>TASK</div>
                  </div>
                  {/* Label rows */}
                  {myItems.map(item => {
                    const proj = projects.find(p => p.id === item.projectId);
                    const del  = proj?.deliverables.find(d => d.id === item.deliverableId);
                    return (
                      <div key={item.id} style={{ display:"flex", height:G_ROW, borderBottom:"1px solid rgba(0,0,0,0.04)", alignItems:"center" }}>
                        <div style={{ width:80, flexShrink:0, padding:"0 8px", borderRight:"1px solid rgba(0,0,0,0.04)", overflow:"hidden", display:"flex", alignItems:"center" }}>
                          <span style={{ fontSize:10, fontWeight:700, color:"#374151", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{proj?.client||"—"}</span>
                        </div>
                        <div style={{ width:180, flexShrink:0, padding:"0 8px", borderRight:"1px solid rgba(0,0,0,0.04)", overflow:"hidden", display:"flex", alignItems:"center" }}>
                          <span style={{ fontSize:10, fontWeight:600, color:proj?.color||"#374151", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }} title={del?.title||item.title}>{del?.title||item.title}</span>
                        </div>
                        <div onClick={() => onEditItem(item)} style={{ width:160, flexShrink:0, padding:"0 8px", overflow:"hidden", display:"flex", alignItems:"center", cursor:"pointer" }}>
                          <span style={{ fontSize:10, fontWeight:600, color:del?"#374151":"#9ca3af", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }} title={del ? item.title : ""}>{del ? item.title : "—"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Scrollable date area */}
                <div ref={scrollRef} style={{ flex:1, overflowX:"auto", WebkitOverflowScrolling:"touch", minWidth:0 }}>
                  <div style={{ minWidth: ganttDays * GDAY_W, position:"relative" }}>
                    {/* Date header */}
                    <div style={{ height:26, position:"relative", background:"#f7f8fa", borderBottom:"1px solid rgba(0,0,0,0.06)" }}>
                      {pto.filter(p => p.personId === person.id).map(p => {
                        const ps = gOff(p.start), pe = gOff(p.end);
                        if (pe < 0 || ps > ganttDays+2) return null;
                        const l = Math.max(0,ps)*GDAY_W, r = Math.min(ganttDays+2,pe+1)*GDAY_W;
                        return <div key={p.id} title={`PTO${p.note?" · "+p.note:""}`} style={{ position:"absolute", left:l, top:0, bottom:0, width:r-l, background:"rgba(0,0,0,0.07)", display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}><span style={{ fontSize:7, fontWeight:700, color:"rgba(0,0,0,0.35)" }}>🌴</span></div>;
                      })}
                      {Array.from({ length: Math.ceil(ganttDays/7) }, (_,wi) => {
                        const d = new Date(gStart.getTime() + wi*7*86400000);
                        return <div key={wi} style={{ position:"absolute", left:wi*7*GDAY_W, height:"100%", display:"flex", alignItems:"center", paddingLeft:4, fontSize:8, color:"#9ca3af", fontWeight:600, borderLeft:"1px solid rgba(0,0,0,0.06)", whiteSpace:"nowrap" }}>{d.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</div>;
                      })}
                    </div>
                    {/* Bar rows */}
                    {myItems.map(item => {
                      const rawOff = gOff(item.start);
                      const eOff   = gOff(item.end);
                      const sOff   = Math.max(0, rawOff);             // clamp bars that started before window
                      const bw     = Math.max((eOff - sOff)*GDAY_W + GDAY_W, 8);
                      const proj   = projects.find(p => p.id === item.projectId);
                      return (
                        <div key={item.id} style={{ height:G_ROW, position:"relative", borderBottom:"1px solid rgba(0,0,0,0.04)", overflow:"hidden" }}
                          onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.02)"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          {/* Holiday shading */}
                          {holidays.map(h => { const ho=gOff(h.date); if(ho<0||ho>ganttDays+2) return null; return <div key={h.date} style={{ position:"absolute", left:ho*GDAY_W, top:0, bottom:0, width:GDAY_W, background:"rgba(251,146,60,0.1)", pointerEvents:"none" }} />; })}
                          {/* PTO shading */}
                          {pto.filter(p=>p.personId===person.id).map(p => {
                            const ps=gOff(p.start), pe=gOff(p.end); if(pe<0||ps>ganttDays+2) return null;
                            const l=Math.max(0,ps)*GDAY_W, r=Math.min(ganttDays+2,pe+1)*GDAY_W;
                            return <div key={p.id} style={{ position:"absolute", left:l, top:0, bottom:0, width:r-l, background:"repeating-linear-gradient(45deg,rgba(0,0,0,0.04) 0px,rgba(0,0,0,0.04) 4px,rgba(0,0,0,0.08) 4px,rgba(0,0,0,0.08) 8px)", pointerEvents:"none", zIndex:1 }} />;
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
                      );
                    })}
                  </div>
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
  }

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

  // ── Shared calendar window — always starts on Sunday, shared across all panels ──
  const sundayOfCurrentWeek = (() => {
    const d = new Date(); d.setHours(0,0,0,0);
    d.setDate(d.getDate() - d.getDay()); // getDay()==0 → stays; 1–6 → back to Sunday
    return d;
  })();
  const [calStart, setCalStart] = useState(sundayOfCurrentWeek);

  const prevWeek = () => setCalStart(d => { const n = new Date(d); n.setDate(n.getDate()-7); return n; });
  const nextWeek = () => setCalStart(d => { const n = new Date(d); n.setDate(n.getDate()+7); return n; });
  const goToday  = () => setCalStart(sundayOfCurrentWeek);

  const calStartStr = calStart.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  const isCurrentWeek = calStart.toDateString() === sundayOfCurrentWeek.toDateString();

  const toggleCollapse = (id) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  const toggleCompare  = (id) => setCompared(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const GDAY_W = 18;
  const G_ROW  = 28;
  const holidaySet = new Set(holidays.map(h => h.date));

  // Timeline review alert state
  const [timelineAlert, setTimelineAlert] = useState(null); // { item, newEnd, delEnd, projEnd, pendingSave }
  const onTimelineReview = (alert) => setTimelineAlert(alert);

  // ── Workload badge ────────────────────────────────────────────────────────
  const loadBadge = (items) => {
    const hrs = items.reduce((s,t) => s + effortHours(t.effort), 0);
    return classifyLoad(hrs, WEEKLY_HOURS);
  };

  // ── PersonPanel ────────────────────────────────────────────────────────────

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

      {/* ── Timeline Review Alert Modal ── */}
      {timelineAlert && (
        <div style={{ position:"fixed", inset:0, zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.35)" }}>
          <div style={{ background:"#fff", borderRadius:12, padding:"28px 32px", maxWidth:420, width:"90vw", boxShadow:"0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize:16, fontWeight:800, color:"#1f2937", marginBottom:8 }}>Timeline Review Recommended</div>
            <div style={{ fontSize:13, color:"#6b7280", marginBottom:16 }}>
              This change pushes work beyond the planned completion date. Please review the timeline.
            </div>
            <div style={{ background:"rgba(0,0,0,0.03)", borderRadius:8, padding:"12px 14px", marginBottom:18, fontSize:12 }}>
              <div style={{ fontWeight:700, color:"#1f2937", marginBottom:6 }}>{timelineAlert.item?.title}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4, color:"#6b7280" }}>
                <span>Original end: <b>{timelineAlert.item?.end}</b></span>
                <span>New end: <b style={{ color:"#f97316" }}>{timelineAlert.newEnd}</b></span>
                {timelineAlert.delEnd && <span>Deliverable due: <b>{timelineAlert.delEnd}</b></span>}
                {timelineAlert.daysPast > 0 && <span style={{ color:"#ef4444" }}>⚠ {timelineAlert.daysPast} day{timelineAlert.daysPast!==1?"s":""} past planned completion</span>}
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => { timelineAlert.pendingSave(); setTimelineAlert(null); }}
                style={{ flex:1, padding:"9px 0", borderRadius:7, background:"#f97316", border:"none", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                Continue Anyway
              </button>
              <button onClick={() => setTimelineAlert(null)}
                style={{ flex:1, padding:"9px 0", borderRadius:7, background:"rgba(0,0,0,0.06)", border:"none", color:"#374151", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main panels ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:14, minWidth:0 }}>

        {/* Shared week navigation — one control drives all panels in both single and compare mode */}
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:"#fff", border:"1px solid rgba(0,0,0,0.07)", borderRadius:8 }}>
          <button onClick={prevWeek}
            style={{ fontSize:11, fontWeight:700, padding:"4px 11px", borderRadius:6, border:"1px solid rgba(0,0,0,0.1)", background:"none", cursor:"pointer", fontFamily:"inherit", color:"#6b7280" }}>
            ← Prev
          </button>
          <div style={{ flex:1, textAlign:"center" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#1f2937" }}>Week of {calStartStr}</span>
            {isCurrentWeek && <span style={{ fontSize:10, color:"#10b981", background:"rgba(16,185,129,0.1)", borderRadius:4, padding:"1px 6px", marginLeft:8, fontWeight:600 }}>Current week</span>}
          </div>
          <button onClick={nextWeek}
            style={{ fontSize:11, fontWeight:700, padding:"4px 11px", borderRadius:6, border:"1px solid rgba(0,0,0,0.1)", background:"none", cursor:"pointer", fontFamily:"inherit", color:"#6b7280" }}>
            Next →
          </button>
          {!isCurrentWeek && (
            <button onClick={goToday}
              style={{ fontSize:10, fontWeight:700, padding:"4px 10px", borderRadius:6, border:"1px solid rgba(80,192,192,0.4)", background:"rgba(80,192,192,0.08)", cursor:"pointer", fontFamily:"inherit", color:"#50C0C0" }}>
              ↩ Today
            </button>
          )}
        </div>

        {viewMode==="compare" && compared.length===0 && (
          <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.07)", borderRadius:10, padding:"32px 20px", textAlign:"center", color:"#9ca3af", fontSize:12 }}>
            Select team members from the sidebar to compare their schedules side by side.
          </div>
        )}
        {visiblePeople.map(person => (
          <PersonPanel key={person.id} person={person} compact={viewMode==="compare"}
            allActive={allActive} projects={projects} collapsed={collapsed} loadBadge={loadBadge}
            GDAY_W={GDAY_W} G_ROW={G_ROW} pto={pto} holidays={holidays} holidaySet={holidaySet}
            calStart={calStart}
            onEditItem={onEditItem} onSaveItem={onSaveItem} toggleCollapse={toggleCollapse}
            onTimelineReview={onTimelineReview}
          />
        ))}
      </div>
    </div>
  );
}


// --- WORKLOAD VIEW ────────────────────────────────────────────────────────────
function WorkloadView({ projects, people, onEditItem, pto = [], holidays = [], adminTasks = [] }) {
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


function Section({ title, icon, count, color = "#6b7280", children, empty, collapsed: initCollapsed = false }) {
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
  }

// ── DoneTasksDropdown — top-level so useState hook is valid ──────────────────
function DoneTasksDropdown({ tasks, onReopen, onDelete }) {
  const [showDone, setShowDone] = React.useState(false);
  if (!tasks.length) return null;
  return (
    <div style={{ borderTop:"1px solid rgba(0,0,0,0.06)" }}>
      <button onClick={() => setShowDone(d => !d)}
        style={{ width:"100%", padding:"9px 16px", background:"rgba(0,0,0,0.02)", border:"none", textAlign:"left", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:8, color:"#9ca3af", fontSize:11, fontWeight:600 }}>
        <span style={{ fontSize:10, transition:"transform 0.15s", display:"inline-block", transform: showDone ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
        Completed ({tasks.length})
      </button>
      {showDone && tasks.map(task => (
        <div key={task.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 16px", borderTop:"1px solid rgba(0,0,0,0.04)", opacity:0.6 }}>
          <label style={{ display:"flex", alignItems:"center", cursor:"pointer", flexShrink:0 }}>
            <input type="checkbox" checked={true} onChange={() => onReopen(task)}
              style={{ width:15, height:15, accentColor:"#34d399", cursor:"pointer" }} />
          </label>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, color:"#9ca3af", textDecoration:"line-through" }}>{task.title}</div>
            {task.dueDate && <div style={{ fontSize:10, color:"#c4c9d4" }}>{task.dueDate}</div>}
          </div>
          <button onClick={() => onDelete(task.id)}
            style={{ background:"none", border:"none", color:"#fca5a5", cursor:"pointer", fontSize:14, flexShrink:0 }}>×</button>
        </div>
      ))}
    </div>
  );
}


// ── AssignTaskModal — admin assigns a task to a team member ──────────────────
function AssignTaskModal({ people, onClose, onSave, editing = null }) {
  const [form, setForm] = useState(editing || {
    title: "", assignedTo: people[0]?.id || "", effort: "M", customHours: 1,
    dueDate: "", notes: "", status: "Not Started",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [error, setError] = useState("");

  const labelStyle  = { fontSize:10, fontWeight:700, color:"#6b7280", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:4, display:"block" };
  const inputStyle  = { width:"100%", fontSize:12, border:"1px solid rgba(0,0,0,0.12)", borderRadius:7, padding:"7px 10px", fontFamily:"inherit", background:"#fff", outline:"none", boxSizing:"border-box" };
  const selectStyle = { width:"100%", background:"#f7f8fa", border:"1px solid rgba(0,0,0,0.08)", borderRadius:6, color:"#111827", padding:"7px 10px", fontFamily:"inherit", fontSize:12, boxSizing:"border-box" };

  return (
    <Overlay onClose={onClose}>
      <ModalShell title={editing ? "Edit Assigned Task" : "Assign Task"} onClose={onClose} accentColor={BRAND_TEAL} width={440}>
        <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={labelStyle}>Task Title *</label>
            <input value={form.title} onChange={e => { set("title", e.target.value); setError(""); }}
              placeholder="e.g. Review Q3 campaign brief" style={inputStyle} autoFocus />
            {error && <div style={{ fontSize:10, color:"#f87171", marginTop:4 }}>{error}</div>}
          </div>
          <div>
            <label style={labelStyle}>Assign To *</label>
            <select value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} style={selectStyle}>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={labelStyle}>Effort</label>
              <select value={form.effort} onChange={e => set("effort", e.target.value)} style={selectStyle}>
                {["S","M","L"].map(e => <option key={e} value={e}>{EFFORT_LABEL[e]}</option>)}
                <option value="C">Custom</option>
              </select>
              {form.effort === "C" && (
                <input type="number" min="0.5" step="0.5" value={form.customHours || 1}
                  onChange={e => set("customHours", parseFloat(e.target.value)||1)}
                  placeholder="Hours" style={{ ...inputStyle, marginTop:6 }} />
              )}
            </div>
            <div>
              <label style={labelStyle}>Due Date</label>
              <input type="date" value={form.dueDate || ""} onChange={e => set("dueDate", e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notes / Instructions</label>
            <textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)}
              placeholder="Context or instructions for this task..."
              style={{ ...inputStyle, minHeight:56, resize:"vertical" }} />
          </div>
          {editing && (
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} style={selectStyle}>
                {["Not Started","In Progress","Done"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ borderTop:"1px solid rgba(0,0,0,0.07)", padding:"14px 20px", display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button onClick={() => {
            if (!form.title.trim()) { setError("Title required"); return; }
            onSave({ ...form, id: editing?.id });
            onClose();
          }}
            style={{ padding:"8px 22px", borderRadius:7, background:BRAND_TEAL, border:"none", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {editing ? "Save Changes" : "Assign Task"}
          </button>
        </div>
      </ModalShell>
    </Overlay>
  );
}


// ── Collapsible bucket for hub sections — module-level so no re-creation ───
function CollapsibleBucket({ label, items, renderItem, accent }) {
  const [open, setOpen] = React.useState(false);
  const ac = accent || "#6b7280";
  if (!items || !items.length) return null;
  return (
    <div style={{ marginTop:8 }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width:"100%", display:"flex", alignItems:"center", gap:8,
          background:"rgba(0,0,0,0.02)", border:"1px solid rgba(0,0,0,0.07)",
          borderRadius:7, padding:"7px 12px", cursor:"pointer",
          fontFamily:"inherit", textAlign:"left" }}>
        <span style={{ fontSize:10, color:ac, transition:"transform 0.15s",
          display:"inline-block", transform:open?"rotate(90deg)":"rotate(0deg)" }}>▶</span>
        <span style={{ fontSize:11, fontWeight:700, color:"#374151" }}>{label}</span>
        <span style={{ fontSize:10, color:"#9ca3af", background:"rgba(0,0,0,0.06)",
          borderRadius:10, padding:"1px 7px", marginLeft:"auto" }}>{items.length}</span>
      </button>
      {open && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginTop:8 }}>
          {items.map(item => renderItem(item))}
        </div>
      )}
    </div>
  );
}


// ── HubTaskTile — module-level component for My Hub task cards ───────────────
function HubTaskTile({ item, onSaveStatus, onOpenItem, statusC }) {
  const statusColors = statusC || {"Not Started":"#6b7280","In Progress":"#38bdf8","Blocked":"#f87171","Done":"#34d399"};
  const urg = (() => {
    if (!item._due) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const d = Math.ceil((new Date(item._due + "T00:00:00") - today) / 86400000);
    if (d < 0)  return { text: Math.abs(d)+"d overdue", color:"#f87171", bg:"rgba(248,113,113,0.1)", w:700 };
    if (d === 0) return { text:"Due today",             color:"#f97316", bg:"rgba(249,115,22,0.1)",  w:700 };
    if (d === 1) return { text:"Due tomorrow",          color:"#fbbf24", bg:"rgba(251,191,36,0.1)",  w:600 };
    if (d <= 7)  return { text:"Due in "+d+"d",         color:"#9ca3af", bg:"rgba(0,0,0,0.05)",      w:500 };
    return { text:"Due in "+d+"d", color:"#9ca3af", bg:"rgba(0,0,0,0.04)", w:400 };
  })();
  const fmtDue = item._due
    ? new Date(item._due + "T00:00:00").toLocaleDateString("en-US", { month:"short", day:"numeric" })
    : null;
  const nextLabel = item.status === "Not Started" ? "▶ Start"
    : item.status === "In Progress" ? "✓ Done"
    : item.status === "Blocked" ? "▶ Go" : "↩";
  const sc = statusColors[item.status] || "#6b7280";
  return (
    <div style={{ display:"flex", alignItems:"stretch", background:"#fff",
      border:"1px solid rgba(0,0,0,0.07)", borderLeft:"3px solid "+item._color,
      borderRadius:8, overflow:"hidden" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow="none"}>
      <div style={{ flex:1, padding:"9px 10px", minWidth:0, cursor:"pointer" }}
        onClick={() => onOpenItem && onOpenItem(item)}>
        <div style={{ fontSize:12, fontWeight:700, color:"#1f2937", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</div>
        <div style={{ fontSize:10, color:item._color, fontWeight:600, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item._label}</div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", alignItems:"center", marginTop:4 }}>
          {urg && <span style={{ fontSize:9, fontWeight:urg.w, color:urg.color, background:urg.bg, borderRadius:4, padding:"2px 6px" }}>{urg.text}</span>}
          {fmtDue && <span style={{ fontSize:9, color:"#9ca3af", background:"rgba(0,0,0,0.04)", borderRadius:4, padding:"2px 5px" }}>{fmtDue}</span>}
          {item.status === "Blocked" && <span style={{ fontSize:9, fontWeight:700, color:"#f87171", background:"rgba(248,113,113,0.1)", borderRadius:4, padding:"2px 6px" }}>Blocked</span>}
          <span style={{ fontSize:9, color:"#9ca3af" }}>{item.status}</span>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", padding:"0 8px", borderLeft:"1px solid rgba(0,0,0,0.05)", background:"rgba(0,0,0,0.01)", flexShrink:0 }}>
        <button type="button"
          onClick={e => { e.stopPropagation(); onSaveStatus && onSaveStatus(item); }}
          style={{ fontSize:9, fontWeight:700, padding:"4px 8px", borderRadius:5,
            border:"1px solid "+sc+"40", background:sc+"12",
            color:sc, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}


// ── Personal Work Report Modal ──────────────────────────────────────────────
function WorkReportModal({ meId, meName, projects, adminTasks, people, onClose }) {
  const today = new Date().toISOString().slice(0,10);
  const thirtyDaysAgo = new Date(Date.now() - 30*86400000).toISOString().slice(0,10);
  const [dateFrom, setDateFrom] = React.useState(thirtyDaysAgo);
  const [dateTo,   setDateTo]   = React.useState(today);
  const [copied,   setCopied]   = React.useState(false);

  const EFFORT_HOURS_MAP = { S:1, M:4, L:8 };

  // Collect all completed tasks assigned to me
  const completedItems = React.useMemo(() => {
    const items = [];

    // Project deliverables + subtasks
    (projects || []).forEach(proj => {
      (proj.deliverables || []).forEach(del => {
        // Check deliverable itself
        const delAssigned = (del.assignees||[]).includes(meId);
        if (delAssigned && del.status === "Done") {
          const completedDate = del.completedAt || del.end || "";
          if (!completedDate || (completedDate >= dateFrom && completedDate <= dateTo)) {
            items.push({
              id: del.id,
              title: del.title,
              project: proj.name,
              type: "Deliverable",
              effort: del.effort || "M",
              customHours: del.customHours || null,
              completedDate: completedDate || del.end || "—",
              hours: del.customHours || EFFORT_HOURS_MAP[del.effort] || 4,
            });
          }
        }
        // Subtasks
        (del.subtasks || []).forEach(sub => {
          const assigned = (sub.assignees||[]).includes(meId);
          if (assigned && sub.status === "Done") {
            const completedDate = sub.completedAt || sub.end || "";
            if (!completedDate || (completedDate >= dateFrom && completedDate <= dateTo)) {
              items.push({
                id: sub.id,
                title: sub.title,
                project: proj.name,
                deliverable: del.title,
                type: "Task",
                effort: sub.effort || "M",
                customHours: sub.customHours || null,
                completedDate: completedDate || sub.end || "—",
                hours: sub.customHours || EFFORT_HOURS_MAP[sub.effort] || 4,
              });
            }
          }
        });
      });
    });

    // Admin tasks
    (adminTasks || []).forEach(t => {
      const assigned = (t.assignedTo === meId) || (t.assignees||[]).includes(meId);
      if (assigned && t.status === "Done") {
        const completedDate = t.completedAt || t.end || t.dueDate || "";
        if (!completedDate || (completedDate >= dateFrom && completedDate <= dateTo)) {
          items.push({
            id: t.id,
            title: t.title,
            project: "Admin / Internal",
            type: "Admin Task",
            effort: t.effort || "M",
            customHours: t.customHours || t.hours || null,
            completedDate: completedDate || "—",
            hours: t.customHours || t.hours || EFFORT_HOURS_MAP[t.effort] || 4,
          });
        }
      }
    });

    return items.sort((a,b) => (b.completedDate||"").localeCompare(a.completedDate||""));
  }, [projects, adminTasks, meId, dateFrom, dateTo]);

  const totalHours = completedItems.reduce((s, item) => s + (item.hours || 0), 0);

  // Group by project for display
  const byProject = completedItems.reduce((acc, item) => {
    const k = item.project || "Other";
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});

  // Copy as plain text for pasting into time entry system
  function handleCopy() {
    const lines = [
      `Work Report — ${meName}`,
      `Period: ${dateFrom} to ${dateTo}`,
      `Total Hours: ${totalHours.toFixed(1)}h`,
      "",
    ];
    Object.entries(byProject).forEach(([proj, tasks]) => {
      const projHours = tasks.reduce((s,t) => s+t.hours, 0);
      lines.push(`${proj} — ${projHours.toFixed(1)}h`);
      tasks.forEach(t => {
        lines.push(`  • ${t.title} (${t.type}) — ${t.hours}h — ${t.completedDate}`);
      });
      lines.push("");
    });
    navigator.clipboard?.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const fmtD = d => d && d !== "—" ? new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "—";
  const inputSt = { padding:"6px 10px", border:"1px solid rgba(255,255,255,0.2)", borderRadius:6, background:"rgba(255,255,255,0.1)", color:"#fff", fontSize:12, fontFamily:"inherit" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100, padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:12, maxWidth:680, width:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 80px rgba(0,0,0,0.4)" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:"#002A4E", borderRadius:"12px 12px 0 0", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:"#fff" }}>📊 My Work Report</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:2 }}>{meName} — completed tasks for time entry</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={inputSt} />
            <span style={{ color:"rgba(255,255,255,0.4)", fontSize:11 }}>to</span>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={inputSt} />
            <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:20, padding:"0 4px" }}>×</button>
          </div>
        </div>

        {/* Summary bar */}
        <div style={{ background:"#f8fafc", borderBottom:"1px solid rgba(0,0,0,0.08)", padding:"12px 20px", display:"flex", alignItems:"center", gap:24 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:900, color:"#002A4E" }}>{completedItems.length}</div>
            <div style={{ fontSize:10, color:"#6b7280", fontWeight:600 }}>TASKS</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:900, color:"#50C0C0" }}>{totalHours.toFixed(1)}h</div>
            <div style={{ fontSize:10, color:"#6b7280", fontWeight:600 }}>TOTAL HOURS</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:900, color:"#6366f1" }}>{Object.keys(byProject).length}</div>
            <div style={{ fontSize:10, color:"#6b7280", fontWeight:600 }}>PROJECTS</div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <button onClick={handleCopy}
              style={{ fontSize:11, fontWeight:700, padding:"7px 14px", background:copied?"#34d399":"#002A4E", color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontFamily:"inherit", transition:"background 0.2s" }}>
              {copied ? "✓ Copied!" : "📋 Copy for Time Entry"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding:"16px 20px" }}>
          {completedItems.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px 0", color:"#9ca3af", fontSize:13 }}>
              No completed tasks found in this date range.
            </div>
          ) : (
            Object.entries(byProject).map(([proj, tasks]) => {
              const projHours = tasks.reduce((s,t)=>s+t.hours,0);
              return (
                <div key={proj} style={{ marginBottom:20 }}>
                  {/* Project header */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, paddingBottom:6, borderBottom:"2px solid #e5e7eb" }}>
                    <span style={{ fontSize:13, fontWeight:800, color:"#1f2937" }}>{proj}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:"#50C0C0", background:"#E6F7F7", borderRadius:6, padding:"2px 10px" }}>{projHours.toFixed(1)}h</span>
                  </div>
                  {/* Task rows */}
                  {tasks.map(task => (
                    <div key={task.id} style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:8, alignItems:"center", padding:"7px 0", borderBottom:"1px solid #f3f4f6" }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:"#1f2937" }}>{task.title}</div>
                        {task.deliverable && <div style={{ fontSize:10, color:"#9ca3af", marginTop:1 }}>{task.deliverable}</div>}
                      </div>
                      <span style={{ fontSize:10, color:"#6b7280", background:"#f1f5f9", borderRadius:4, padding:"1px 7px", whiteSpace:"nowrap" }}>{task.type}</span>
                      <span style={{ fontSize:11, color:"#6b7280", whiteSpace:"nowrap" }}>{fmtD(task.completedDate)}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:"#374151", background:"#f9fafb", borderRadius:5, padding:"3px 10px", minWidth:40, textAlign:"center", border:"1px solid #e5e7eb" }}>
                        {task.hours}h
                      </span>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Footer note */}
        <div style={{ padding:"10px 20px 16px", borderTop:"1px solid #f3f4f6" }}>
          <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>
            Hours are based on task effort sizing (S=1h, M=4h, L=8h) or custom hours if set. Completed date is the task end date or when it was marked Done.
          </p>
        </div>
      </div>
    </div>
  );
}


function MyHubView({ projects, people, holidays, pto = [], currentUserId, onSetCurrentUser, onEditItem, onMarkDone, onSaveItem, savePto, deletePto, personalTasks = [], onSavePersonalTask, onDeletePersonalTask, currentRole = "member", authMemberId = "", authUUID = "", adminTasks = [], onSaveAdminTask, onUpdateAdminTaskStatus, onDeleteAdminTask, notifications = [], onDismissNotification, onOpenNotifTask, setToastNotif }) {
  const TODAY = new Date(); TODAY.setHours(0,0,0,0);

  // Week bounds (Mon–Sun)
  const weekStart = new Date(TODAY);
  const day = weekStart.getDay(); weekStart.setDate(weekStart.getDate() - day); // Sunday = 0, so subtract getDay()
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const weekStartStr = weekStart.toISOString().slice(0,10);
  const weekEndStr   = weekEnd.toISOString().slice(0,10);

  const todayStr = TODAY.toISOString().slice(0,10);

  const efv = (e) => EFFORT_VAL[e] || 2;

  const [showPtoForm,   setShowPtoForm]   = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingAdminTask, setEditingAdminTask] = useState(null);
  const [ptoForm, setPtoForm] = useState({ start: todayStr, end: todayStr, note: "" });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showWorkReport, setShowWorkReport] = useState(false);
  const [waitingIds, setWaitingIds] = useState(new Set()); // tasks parked from Focus strip
  const [sortBy, setSortBy] = useState("date"); // "date" | "project"
  const [filterProject, setFilterProject] = useState(""); // "" = all, or projId
  const [taskForm, setTaskForm] = useState({ title: "", status: "Not Started", priority: "Medium", dueDate: "", notes: "" });
  const hubHolidaySet = new Set((holidays||[]).map(h => h.date));

  // ── Resolve current user ──────────────────────────────────────────────────
  // Members always locked to their own hub — never allow state-manipulation bypass
  const effectiveUserId = currentRole === "admin"
    ? (currentUserId || authMemberId || people[0]?.id || "")
    : (authMemberId || currentUserId || people[0]?.id || "");
  const me   = people.find(p => p.id === effectiveUserId) || people[0];
  const meId = me?.id || authMemberId || people[0]?.id || "";

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

  // ── Section data — SINGLE SECTION RULE: each task appears in highest-priority section only ──
  const activeTasks   = allMyTasks.filter(t => t.status !== "Done");
  // Build sections in priority order; track which IDs have been claimed
  const claimedIds = new Set();
  const claim = (tasks) => { tasks.forEach(t => claimedIds.add(t.id)); return tasks; };
  const unclaimed = (tasks) => tasks.filter(t => !claimedIds.has(t.id));

  const overdueTasks  = claim(allMyTasks.filter(isOverdue).sort((a,b) => daysDiff(a.end) - daysDiff(b.end)));
  const blockedTasks  = claim(unclaimed(allMyTasks.filter(t => t.status === "Blocked" || (t.status !== "Done" && blockedBy(t).length > 0))));
  const dueSoonTasks  = claim(unclaimed(allMyTasks.filter(t => !isOverdue(t) && isDueSoon(t)).sort((a,b) => daysDiff(a.end) - daysDiff(b.end))));
  const readyTasks    = claim(unclaimed(allMyTasks.filter(t => t.status !== "Done" && t.status !== "Blocked" && isDependencyClear(t))));
  const waitingTasks  = claim(unclaimed(allMyTasks.filter(t =>
    t.status !== "Done" && (t.dependencies || []).some(depId => {
      const dep = taskById[depId];
      return dep && dep.status !== "Done" && !(dep.assignees || []).includes(meId);
    })
  )));
  const recommended   = [...readyTasks].filter(t => !waitingIds.has(t.id)).sort((a,b) => score(b) - score(a)).slice(0, 8);
  const topFocusTask  = recommended[0] || [...activeTasks].filter(t => !waitingIds.has(t.id)).sort((a,b) => score(b) - score(a))[0] || null;
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
  // Status cycle helper — next logical status for a task
  const cycleStatus = (current) => {
    const cycle = { "Not Started": "In Progress", "In Progress": "Done", "Done": "Not Started", "Blocked": "In Progress" };
    return cycle[current] || "In Progress";
  };
  const saveStatus = (task, newStatus) => {
    // Optimistic update via onSaveItem (or onMarkDone for Done)
    if (newStatus === "Done") {
      onMarkDone(task.projId, task.isSubtask ? task.delId : task.id, task.isSubtask ? task.id : null);
    } else {
      onSaveItem && onSaveItem({ ...task, status: newStatus,
        projectId: task.projId, projectName: task.projName,
        deliverableId: task.isSubtask ? (task.deliverableId || task.delId) : null });
    }
  };







  if (!me) return React.createElement("div", {style:{background:"#fff",border:"1px solid rgba(0,0,0,0.07)",borderRadius:10,padding:40,textAlign:"center"}}, React.createElement("div", {style:{fontSize:14,color:"#6b7280"}}, "No team members yet. Add people in ⚙ Settings → Team Members."));  const todayD = new Date(); todayD.setHours(0,0,0,0);
  const todayISO = todayD.toISOString().slice(0,10);
  const statusC = {"Not Started":"#6b7280","In Progress":"#38bdf8","Blocked":"#f87171","Done":"#34d399"};
  const handleSaveStatus = (item) => {
  const order = ["Not Started","In Progress","Done","Blocked"];
  const cur = item.status || "Not Started";
  const next = cur === "Not Started" ? "In Progress" : cur === "In Progress" ? "Done" : cur === "Done" ? "Not Started" : "Not Started";
  if (item._type === "admin") { onUpdateAdminTaskStatus && onUpdateAdminTaskStatus(item._key, next); }
  else { onSaveItem && onSaveItem({ ...item, status: next, projectId: item.projId, projectName: item.projName, deliverableId: item.isSubtask ? (item.deliverableId || item.delId) : null }); }
  };
  const handleOpenItem = (item) => {
  if (item._type === "admin") { setEditingAdminTask(adminTasks.find(t=>t.id===item._key)||null); setShowAssignModal(true); }
  else { onEditItem({ ...item, projectId: item.projId, projectName: item.projName, projectColor: item.projColor, deliverableId: item.isSubtask ? (item.deliverableId || item.delId) : null }); }
  };
  const in14  = new Date(todayD); in14.setDate(todayD.getDate()+14);
  const in28  = new Date(todayD); in28.setDate(todayD.getDate()+28);
  const in14s = in14.toISOString().slice(0,10);
  const in28s = in28.toISOString().slice(0,10);

  const diffD = (ds) => {
  if (!ds) return null;
  return Math.ceil((new Date(ds+"T00:00:00") - todayD) / 86400000);
  };
  const urgency = (ds) => {
  const d = diffD(ds);
  if (d === null) return null;
  if (d < 0)  return { text: Math.abs(d)+"d overdue", color:"#f87171", bg:"rgba(248,113,113,0.1)", w:700 };
  if (d === 0) return { text:"Due today",              color:"#f97316", bg:"rgba(249,115,22,0.1)",  w:700 };
  if (d === 1) return { text:"Due tomorrow",           color:"#fbbf24", bg:"rgba(251,191,36,0.1)",  w:600 };
  if (d <= 7)  return { text:"Due in "+d+"d",          color:"#9ca3af", bg:"rgba(0,0,0,0.05)",      w:500 };
  return null;
  };


  // Merge project tasks + admin tasks
  const projItems = allMyTasks
  .filter(t => t.status !== "Done")
  .map(t => ({
    ...t, _type:"project", _key:t.id,
    _label: t.projName + (t.isSubtask && t.delTitle ? " · "+t.delTitle : ""),
    _color: t.projColor, _due: t.end||"",
  }));

  const adminItems = adminTasks
  .filter(t => t.assignedTo === meId && t.status !== "Done")
  .map(t => {
    const by = people.find(p=>p.id===t.assignedBy);
    return {
      ...t, status:t.status||"Not Started", effort:t.effort||"M",
      dependencies:[], assignees:[meId],
      projId:null, delId:null, projName:"", projColor:BRAND_TEAL,
      _type:"admin", _key:t.id,
      _label: by ? "Assigned by "+by.name : "One-off task",
      _color: BRAND_TEAL, _due: t.dueDate||"",
    };
  });

  const allCombined = [...projItems, ...adminItems];
  const all = allCombined.sort((a,b)=>{
  const ad=a._due, bd=b._due;
  if(!ad&&!bd) return 0; if(!ad) return 1; if(!bd) return -1;
  return ad<bd?-1:ad>bd?1:0;
  });

  // Bucket by time horizon
  // "This Week"   = overdue + today + rest of current week (Mon-Sun)
  // "Next 2-4 Wks" = after this week end up to 28 days out
  // "4 Weeks+"    = beyond 28 days
  const overdueItems  = all.filter(t => t._due && t._due < todayISO);
  const thisWeekItems = all.filter(t => t._due && t._due >= todayISO && t._due <= weekEndStr);
  const week4Items    = all.filter(t => t._due && t._due > weekEndStr && t._due <= in28s);
  const futureItems   = all.filter(t => t._due && t._due > in28s);
  const nodateItems   = all.filter(t => !t._due);

  // Apply sort within each bucket
  // Distinct projects the current user has active tasks in (for filter dropdown)
  const myProjectOptions = [...new Map(
    all.map(t => [t.projId, { id: t.projId, name: t.projName }])
  ).values()].sort((a, b) => (a.name||"").localeCompare(b.name||""));

  const sortItems = (items) => {
    // 1. Apply project filter
    const filtered = filterProject ? items.filter(t => t.projId === filterProject) : items;
    // 2. Apply sort
    if (sortBy === "project") {
      return [...filtered].sort((a, b) => {
        const pCmp = (a.projName||"").localeCompare(b.projName||"");
        if (pCmp !== 0) return pCmp;
        const ad = a._due, bd = b._due;
        if (!ad && !bd) return 0; if (!ad) return 1; if (!bd) return -1;
        return ad < bd ? -1 : ad > bd ? 1 : 0;
      });
    }
    return filtered; // already date-sorted from `all`
  };

  const activeNow   = [...overdueItems, ...thisWeekItems]; // for the "urgent" count badge
  const totalActive = all.length;
  const overdueCount = overdueItems.length;


  // CollapsibleBucket defined at MyHubView level

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Hub Header ── */}
      <div style={{ background: BRAND_NAVY, borderRadius: 12, padding: "18px 20px", color: "#fff" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:"50%", background:me.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:900, color:"#fff", flexShrink:0, border:"2px solid rgba(255,255,255,0.2)" }}>
              {me.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
            </div>
            <div>
              <div style={{ fontSize:17, fontWeight:900, color:"#fff", lineHeight:1.2 }}>{me.name}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.55)", marginTop:2 }}>
                {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {currentRole === "admin" && (
              <>
                <select value={meId} onChange={e => onSetCurrentUser(e.target.value)}
                  style={{ fontSize:11, border:"1px solid rgba(255,255,255,0.2)", borderRadius:6, padding:"5px 10px", background:"rgba(255,255,255,0.1)", color:"#fff", fontFamily:"inherit" }}>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={() => { setEditingAdminTask(null); setShowAssignModal(true); }}
                  style={{ fontSize:10, fontWeight:700, color:BRAND_NAVY, background:BRAND_TEAL, border:"none", borderRadius:6, padding:"6px 12px", cursor:"pointer", fontFamily:"inherit" }}>
                  + Assign Task
                </button>
                <button onClick={() => setShowWorkReport(true)}
                  style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.8)", background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:6, padding:"6px 12px", cursor:"pointer", fontFamily:"inherit" }}>
                  &#128202; My Work Report
                </button>
              </>
            )}
          </div>
        </div>

        {/* Focus strip — top recommended task */}
        {topFocusTask && (() => {
          const top = topFocusTask;
          const d = daysDiff(top.end);
          const urgency = d < 0 ? "Overdue" : d === 0 ? "Due today" : d <= 2 ? `Due in ${d}d` : "Next up";
          const urgColor = d < 0 ? "#f87171" : d === 0 ? "#fb923c" : d <= 2 ? "#fbbf24" : BRAND_TEAL;
          const handleStart = () => {
            if (top.status === "In Progress") return;
            if (top._type === "admin") { onUpdateAdminTaskStatus && onUpdateAdminTaskStatus(top.id, "In Progress"); }
            else { saveStatus(top, "In Progress"); }
          };
          const handleDone = () => {
            if (top._type === "admin") { onUpdateAdminTaskStatus && onUpdateAdminTaskStatus(top.id, "Done"); }
            else { saveStatus(top, "Done"); }
          };
          const handleWaiting = () => {
            setWaitingIds && setWaitingIds(prev => new Set([...(prev||[]), top.id]));
          };
          const handleOpen = () => onEditItem({
            ...top, projectId: top.projId, projectName: top.projName,
            projectColor: top.projColor,
            deliverableId: top.isSubtask ? (top.deliverableId || top.delId) : null,
          });
          return (
            <div style={{ marginTop:14, background:"rgba(255,255,255,0.08)", borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:9, fontWeight:700, color:urgColor, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:3 }}>
                  {urgency} · Focus
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{top.title}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", marginTop:1 }}>{top.projName || top._label || ""}{top.delTitle ? ` · ${top.delTitle}` : ""}</div>
              </div>
              <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                {top.status !== "In Progress" && (
                  <button
                    type="button"
                    onClick={handleStart}
                    style={{ fontSize:10, fontWeight:700, color:BRAND_TEAL, background:"rgba(80,192,192,0.15)", border:"1px solid rgba(80,192,192,0.3)", borderRadius:6, padding:"6px 12px", cursor:"pointer", fontFamily:"inherit" }}>
                    ▶ Start
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleOpen}
                  style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.7)", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:6, padding:"6px 12px", cursor:"pointer", fontFamily:"inherit" }}>
                  Open
                </button>
                <button
                  type="button"
                  onClick={handleWaiting}
                  title="Park this task and surface the next one"
                  style={{ fontSize:10, fontWeight:700, color:"#fbbf24", background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.35)", borderRadius:6, padding:"6px 12px", cursor:"pointer", fontFamily:"inherit" }}>
                  Waiting
                </button>
                <button
                  type="button"
                  onClick={handleDone}
                  style={{ fontSize:10, fontWeight:700, color:"#34d399", background:"rgba(52,211,153,0.12)", border:"1px solid rgba(52,211,153,0.35)", borderRadius:6, padding:"6px 12px", cursor:"pointer", fontFamily:"inherit" }}>
                  ✓ Done
                </button>

              </div>
            </div>
          );
        })()}

        {/* Workload summary row */}
        <div style={{ marginTop:10, display:"flex", gap:20, flexWrap:"wrap" }}>
          {[
            { label:"Active", val:activeTasks.length, color:"rgba(255,255,255,0.9)" },
            { label:"Due this week", val:weekTasks.length, color:weekTasks.length > 5 ? "#fbbf24" : "rgba(255,255,255,0.9)" },
            { label:"Overdue", val:overdueTasks.length, color:overdueTasks.length > 0 ? "#f87171" : "rgba(255,255,255,0.4)" },
            { label:"Capacity", val:loadLabel, color:loadColor },
          ].map(item => (
            <div key={item.label} style={{ display:"flex", flexDirection:"column", gap:1 }}>
              <span style={{ fontSize:13, fontWeight:900, color:item.color, lineHeight:1 }}>{item.val}</span>
              <span style={{ fontSize:9, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.05em" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>



      {/* ── PTO ── */}
      <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.07)", borderRadius:10, padding:"12px 16px" }}>
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

      {/* ── Notification Center ── */}
      {(() => {
        const allUnread = notifications.filter(n => !n.isRead);
        const completions  = allUnread.filter(n => n.type === "task_completed");
        const assignments  = allUnread.filter(n => n.type === "task_assigned"  && n.assignedToPersonId === meId);
        const readyToStart = allUnread.filter(n => n.type === "task_ready"     && n.assignedToPersonId === meId);
        // Admin: completions + assignments + ready-to-start for viewed person
        // Member: own assignments + own ready-to-start
        const visibleNotifs = currentRole === "admin"
          ? [...completions, ...assignments, ...readyToStart]
          : [...assignments, ...readyToStart];
        if (!visibleNotifs.length) return null;
        const typeIcon  = { task_completed:"✓", task_assigned:"+", task_ready:"▶" };
        const typeColor = { task_completed:"#f97316", task_assigned:BRAND_TEAL, task_ready:"#6366f1" };
        const typeLabel = { task_completed:"Task Completed", task_assigned:"Assigned to You", task_ready:"Ready to Start" };
        return (
          <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", background:"#f8fafc", borderBottom:"1px solid rgba(0,0,0,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:15 }}>🔔</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:800, color:"#1f2937" }}>Notifications</div>
                  <div style={{ fontSize:10, color:"#9ca3af" }}>
                    {completions.length > 0 && assignments.length > 0
                    ? `${completions.length} completion${completions.length!==1?"s":""} to review · ${assignments.length} assigned to ${meId===authMemberId?"you":me?.name}`
                    : completions.length > 0
                    ? `${completions.length} task${completions.length!==1?"s":""} completed — tap to review`
                    : `${assignments.length} task${assignments.length!==1?"s":""} assigned to ${meId===authMemberId?"you":me?.name}`}
                  </div>
                </div>
                <span style={{ fontSize:10, fontWeight:700, color:"#fff", background:"#f97316", borderRadius:10, padding:"1px 8px", flexShrink:0 }}>{visibleNotifs.length}</span>
              </div>
              <button onClick={() => visibleNotifs.forEach(n => onDismissNotification?.(n.id))}
                style={{ fontSize:10, color:"#6b7280", background:"none", border:"1px solid rgba(0,0,0,0.1)", borderRadius:5, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit" }}>
                Clear all
              </button>
            </div>
            <div>
              {visibleNotifs.map(n => {
                const person = people.find(p => p.id === (n.completedByPersonId || n.assignedToPersonId));
                const when = n.createdAt ? new Date(n.createdAt).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) : "";
                const color = typeColor[n.type] || "#9ca3af";
                return (
                  <div key={n.id}
                    style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 16px", borderBottom:"1px solid rgba(0,0,0,0.04)", cursor:n.type==="task_completed"?"pointer":"default" }}
                    onClick={() => n.type === "task_completed" && onOpenNotifTask?.(n)}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.015)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div style={{ position:"relative", flexShrink:0 }}>
                      <div style={{ width:32, height:32, borderRadius:"50%", background:person?.color||"#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"#fff" }}>
                        {person?.name?.split(" ").map(w=>w[0]).join("").slice(0,2)||"?"}
                      </div>
                      <span style={{ position:"absolute", bottom:-1, right:-1, width:14, height:14, borderRadius:"50%", background:color, border:"2px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:7, color:"#fff", fontWeight:900 }}>
                        {typeIcon[n.type]||"●"}
                      </span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:10, color:color, fontWeight:700, marginBottom:2 }}>
                        {typeLabel[n.type] || n.type}
                        {n.type==="task_completed" && <span style={{ fontSize:9, color:"#9ca3af", fontWeight:400, marginLeft:6 }}>click to open</span>}
                      </div>
                      <div style={{ fontSize:12, fontWeight:600, color:"#1f2937", lineHeight:1.4 }}>{n.message}</div>
                      <div style={{ fontSize:10, color:"#9ca3af", marginTop:3 }}>{when}</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:4, flexShrink:0 }}>
                      {n.type === "task_assigned" && (
                        <button onClick={e => {
                          e.stopPropagation();
                          const tid = n.taskId || n.task_id;
                          if (!tid) return;
                          const admin = adminTasks.find(t => t.id === tid);
                          if (admin) { setEditingAdminTask(admin); setShowAssignModal(true); return; }
                          let found = null;
                          for (let pi = 0; pi < projects.length && !found; pi++) {
                            const p = projects[pi];
                            for (let di = 0; di < (p.deliverables||[]).length && !found; di++) {
                              const d = p.deliverables[di];
                              if (d.id === tid) { found = { ...d, projectId:p.id, projectName:p.name, projectColor:p.color, deliverableId:null }; }
                              else { const s = (d.subtasks||[]).find(x => x.id === tid); if (s) found = { ...s, projectId:p.id, projectName:p.name, projectColor:p.color, deliverableId:d.id }; }
                            }
                          }
                          if (found) onEditItem(found);
                        }}
                          style={{ fontSize:10, fontWeight:700, color:BRAND_TEAL, background:"rgba(80,192,192,0.1)", border:"1px solid rgba(80,192,192,0.25)", borderRadius:5, padding:"4px 9px", cursor:"pointer", fontFamily:"inherit" }}>
                          View Task
                        </button>
                      )}
                      {n.type === "task_ready" && (() => {
                        // Reuse same task-lookup logic as "View Task"
                        function findAndOpen(andStart) {
                          const tid = n.taskId;
                          if (!tid) return;
                          let found = null;
                          for (let pi = 0; pi < projects.length && !found; pi++) {
                            const p = projects[pi];
                            for (let di = 0; di < (p.deliverables||[]).length && !found; di++) {
                              const d = p.deliverables[di];
                              if (d.id === tid) { found = { ...d, projectId:p.id, projectName:p.name, projectColor:p.color, deliverableId:null }; }
                              else { const s = (d.subtasks||[]).find(x => x.id === tid); if (s) found = { ...s, projectId:p.id, projectName:p.name, projectColor:p.color, deliverableId:d.id }; }
                            }
                          }
                          if (!found) return;
                          if (andStart) {
                            onSaveItem && onSaveItem({ ...found, status:"In Progress" });
                            onDismissNotification?.(n.id);
                          } else {
                            onEditItem(found);
                          }
                        }
                        return (
                          <>
                            <button onClick={e => { e.stopPropagation(); findAndOpen(true); }}
                              style={{ fontSize:10, fontWeight:700, color:"#fff", background:"#6366f1", border:"none", borderRadius:5, padding:"4px 9px", cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                              ▶ Start
                            </button>
                            <button onClick={e => { e.stopPropagation(); findAndOpen(false); }}
                              style={{ fontSize:10, fontWeight:700, color:"#6366f1", background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.25)", borderRadius:5, padding:"4px 9px", cursor:"pointer", fontFamily:"inherit" }}>
                              View
                            </button>
                          </>
                        );
                      })()}
                      <button onClick={e => { e.stopPropagation(); onDismissNotification?.(n.id); }}
                        style={{ fontSize:10, color:"#9ca3af", background:"rgba(0,0,0,0.04)", border:"none", borderRadius:5, padding:"4px 8px", cursor:"pointer", fontFamily:"inherit" }}>
                        {n.type==="task_completed" ? "✓ Reviewed" : n.type==="task_ready" ? "✓ Done" : "✓ Clear"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── My Tasks (personal, private) ── */}
      {meId === authMemberId && (
      <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:10, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(0,0,0,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:13 }}>☑</span>
            <span style={{ fontSize:12, fontWeight:800, color:"#1f2937" }}>My Tasks</span>
            <span style={{ fontSize:9, color:"#9ca3af", background:"rgba(0,0,0,0.04)", borderRadius:4, padding:"1px 6px" }}>🔒 Only you</span>
            <span style={{ fontSize:10, color:"#6b7280", background:"rgba(0,0,0,0.05)", borderRadius:10, padding:"1px 7px" }}>
              {personalTasks.filter(t=>t.status!=="Done").length} active
            </span>
          </div>
          <button onClick={() => { setEditingTask(null); setTaskForm({ title:"", priority:"Medium", dueDate:"", notes:"" }); setShowTaskForm(true); }}
            style={{ fontSize:11, fontWeight:700, color:BRAND_TEAL, background:"rgba(80,192,192,0.08)", border:"1px solid rgba(80,192,192,0.25)", borderRadius:6, padding:"5px 12px", cursor:"pointer", fontFamily:"inherit" }}>
            + Add Task
          </button>
        </div>
        <div style={{ padding:"8px 0" }}>
          {/* ── Inline Add/Edit form ── */}
          {showTaskForm && (
            <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(0,0,0,0.06)", background:"#f8fafc" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <input
                  autoFocus
                  value={taskForm.title}
                  onChange={e => setTaskForm(f => ({...f, title:e.target.value}))}
                  onKeyDown={e => {
                    if (e.key === "Enter" && taskForm.title.trim()) {
                      if (editingTask) {
                        onSavePersonalTask({...editingTask, ...taskForm});
                      } else {
                        onSavePersonalTask({id:"pt_"+Date.now(), ...taskForm, status:"Not Started"});
                      }
                      setShowTaskForm(false); setEditingTask(null);
                    }
                    if (e.key === "Escape") { setShowTaskForm(false); setEditingTask(null); }
                  }}
                  placeholder="Task title…"
                  style={{ padding:"7px 10px", border:"1px solid rgba(80,192,192,0.4)", borderRadius:6, fontSize:13, fontFamily:"inherit", outline:"none", width:"100%", boxSizing:"border-box" }}
                />
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <select value={taskForm.priority} onChange={e => setTaskForm(f=>({...f,priority:e.target.value}))}
                    style={{ fontSize:11, padding:"4px 8px", border:"1px solid rgba(0,0,0,0.15)", borderRadius:5, fontFamily:"inherit" }}>
                    {["Low","Medium","High","Urgent"].map(p=><option key={p}>{p}</option>)}
                  </select>
                  <input type="date" value={taskForm.dueDate} onChange={e=>setTaskForm(f=>({...f,dueDate:e.target.value}))}
                    style={{ fontSize:11, padding:"4px 8px", border:"1px solid rgba(0,0,0,0.15)", borderRadius:5, fontFamily:"inherit" }} />
                  <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
                    <button onClick={() => { setShowTaskForm(false); setEditingTask(null); }}
                      style={{ fontSize:11, padding:"5px 10px", background:"none", border:"1px solid rgba(0,0,0,0.15)", borderRadius:5, cursor:"pointer", fontFamily:"inherit" }}>
                      Cancel
                    </button>
                    <button onClick={() => {
                      if (!taskForm.title.trim()) return;
                      if (editingTask) {
                        onSavePersonalTask({...editingTask, ...taskForm});
                      } else {
                        onSavePersonalTask({id:"pt_"+Date.now(), ...taskForm, status:"Not Started"});
                      }
                      setShowTaskForm(false); setEditingTask(null);
                    }}
                      style={{ fontSize:11, fontWeight:700, padding:"5px 12px", background:BRAND_TEAL, color:"#fff", border:"none", borderRadius:5, cursor:"pointer", fontFamily:"inherit" }}>
                      {editingTask ? "Save" : "Add Task"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {personalTasks.filter(t=>t.status!=="Done").length === 0 && (
            <div style={{ fontSize:12, color:"#9ca3af", textAlign:"center", padding:"16px 0" }}>No active tasks. Add one above.</div>
          )}
          {personalTasks.filter(t=>t.status!=="Done").map(task => {
            const isOD = task.dueDate && task.dueDate < todayStr;
            const isDT = task.dueDate === todayStr;
            return (
              <div key={task.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 16px", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                <label style={{ display:"flex", alignItems:"center", cursor:"pointer", flexShrink:0, marginTop:1 }}>
                  <input type="checkbox" checked={task.status==="Done"}
                    onChange={() => onSavePersonalTask({...task, status: task.status==="Done"?"Not Started":"Done"})}
                    style={{ width:15, height:15, accentColor:BRAND_TEAL, cursor:"pointer" }} />
                </label>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#1f2937" }}>{task.title}</div>
                  {task.dueDate && <div style={{ fontSize:10, color:isOD?"#f87171":isDT?"#f97316":"#9ca3af", fontWeight:isOD||isDT?700:400, marginTop:1 }}>
                    {isOD?"Overdue · ":isDT?"Due today · ":""}{task.dueDate}
                  </div>}
                </div>
                <button onClick={() => { setEditingTask(task); setTaskForm({ title:task.title, priority:task.priority||"Medium", dueDate:task.dueDate||"", notes:task.notes||"" }); setShowTaskForm(true); }}
                  style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:12, padding:"0 2px" }}>✎</button>
                <button onClick={() => onDeletePersonalTask(task.id)}
                  style={{ background:"none", border:"none", color:"#fca5a5", cursor:"pointer", fontSize:15, padding:"0 2px" }}>×</button>
              </div>
            );
          })}
        </div>
      </div>
    )}


      {/* ── Assigned to Me ── */}
      <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:10, overflow:"hidden" }}>
        {/* Header */}
        <div style={{ padding:"12px 16px", background:"#f8fafc", borderBottom:"1px solid rgba(0,0,0,0.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:13 }}>◎</span>
            <span style={{ fontSize:13, fontWeight:800, color:"#1f2937" }}>
              Assigned to {meId === authMemberId ? "Me" : (people.find(p=>p.id===meId)?.name||"Them")}
            </span>
            <span style={{ fontSize:10, color:"#6b7280", background:"rgba(0,0,0,0.05)", borderRadius:10, padding:"1px 8px", fontWeight:600 }}>
              {totalActive} active
            </span>
            {overdueCount > 0 && (
              <span style={{ fontSize:10, color:"#f87171", background:"rgba(248,113,113,0.1)", borderRadius:10, padding:"1px 8px", fontWeight:700 }}>
                {overdueCount} urgent
              </span>
            )}
          </div>
          {currentRole === "admin" && (
            <button onClick={() => { setEditingAdminTask(null); setShowAssignModal(true); }}
              style={{ fontSize:11, fontWeight:700, color:"#fff", background:BRAND_TEAL, border:"none", borderRadius:6, padding:"6px 14px", cursor:"pointer", fontFamily:"inherit" }}>
              + Assign Task
            </button>
          )}
        </div>

        {/* Dependency awareness */}
        {(tasksBlockedByMe.length > 0 || waitingTasks.length > 0) && (
          <div style={{ padding:"7px 16px", background:"rgba(251,191,36,0.05)", borderBottom:"1px solid rgba(251,191,36,0.15)", display:"flex", gap:16, flexWrap:"wrap" }}>
            {tasksBlockedByMe.length > 0 && (
              <span style={{ fontSize:10, color:"#f97316", fontWeight:600 }}>⚠ You are blocking {tasksBlockedByMe.length} downstream task{tasksBlockedByMe.length!==1?"s":""}</span>
            )}
            {waitingTasks.length > 0 && (
              <span style={{ fontSize:10, color:"#9ca3af", fontWeight:600 }}>⏳ Waiting on {waitingTasks.length} task{waitingTasks.length!==1?"s":""} from others before you can proceed</span>
            )}
          </div>
        )}

        {all.length === 0 && (
          <div style={{ padding:"28px 16px", textAlign:"center", color:"#9ca3af", fontSize:12 }}>
            No active tasks assigned to you.
            {currentRole === "admin" && <span style={{ display:"block", fontSize:11, marginTop:4, color:"#d1d5db" }}>Use + Assign Task to add a one-off task for any team member.</span>}
          </div>
        )}


        {all.length > 0 && (
          <>
            {/* ── Sort + Filter controls ── */}
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px 4px", flexWrap:"wrap" }}>
              <span style={{ fontSize:10, color:"#9ca3af", fontWeight:600, marginRight:2 }}>SORT:</span>
              {[["date","By Date"],["project","By Project"]].map(([val,label]) => (
                <button key={val} onClick={() => setSortBy(val)}
                  style={{ fontSize:10, fontWeight:600, padding:"3px 9px", borderRadius:5, cursor:"pointer", fontFamily:"inherit",
                    background: sortBy===val ? BRAND_TEAL+"18" : "none",
                    color: sortBy===val ? BRAND_TEAL : "#9ca3af",
                    border: "1px solid "+(sortBy===val ? BRAND_TEAL+"40" : "rgba(0,0,0,0.08)") }}>
                  {label}
                </button>
              ))}
              {myProjectOptions.length > 1 && (
                <>
                  <span style={{ fontSize:10, color:"rgba(0,0,0,0.15)", margin:"0 2px" }}>|</span>
                  <span style={{ fontSize:10, color:"#9ca3af", fontWeight:600 }}>PROJECT:</span>
                  <select
                    value={filterProject}
                    onChange={e => setFilterProject(e.target.value)}
                    style={{ fontSize:10, padding:"3px 7px", borderRadius:5, border:"1px solid rgba(0,0,0,0.12)",
                      background: filterProject ? BRAND_TEAL+"12" : "#fff",
                      color: filterProject ? BRAND_TEAL : "#6b7280",
                      fontFamily:"inherit", cursor:"pointer", outline:"none", maxWidth:160 }}>
                    <option value="">All Projects</option>
                    {myProjectOptions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {filterProject && (
                    <button onClick={() => setFilterProject("")}
                      style={{ fontSize:10, color:"#9ca3af", background:"none", border:"none", cursor:"pointer", padding:"2px 4px", fontFamily:"inherit" }}>
                      ✕ Clear
                    </button>
                  )}
                </>
              )}
            </div>

            {/* ── This Week (overdue + due by Sunday) ── */}
            <div style={{ padding:"0 16px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6, marginTop:6, display:"flex", alignItems:"center", gap:6 }}>
                This Week
                {overdueItems.length > 0 && <span style={{ fontSize:9, fontWeight:700, color:"#f87171", background:"rgba(248,113,113,0.1)", borderRadius:4, padding:"1px 6px" }}>{overdueItems.length} overdue</span>}
                {activeNow.length > 0 && <span style={{ color:"#9ca3af", fontWeight:500, textTransform:"none", letterSpacing:0 }}>({activeNow.length})</span>}
              </div>
              {activeNow.length === 0 && (
                <div style={{ fontSize:11, color:"#9ca3af", padding:"8px 0", marginBottom:8 }}>All clear this week.</div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:8 }}>
                {sortItems(activeNow).map(item => <HubTaskTile key={item._key} item={item}
                  statusC={statusC} onOpenItem={handleOpenItem} onSaveStatus={handleSaveStatus} />)}
              </div>
            </div>

            {/* ── Next 2–4 Weeks ── */}
            <CollapsibleBucket label="Next 2–4 Weeks" items={sortItems(week4Items)} accent="#6366f1" renderItem={item =>
              <HubTaskTile key={item._key} item={item} statusC={statusC} onOpenItem={handleOpenItem} onSaveStatus={handleSaveStatus} />} />

            {/* ── 4 Weeks+ ── */}
            <CollapsibleBucket label="4 Weeks+" items={sortItems([...futureItems,...nodateItems])} accent="#9ca3af" renderItem={item =>
              <HubTaskTile key={item._key} item={item} statusC={statusC} onOpenItem={handleOpenItem} onSaveStatus={handleSaveStatus} />} />
          </>
        )}

        {/* Done tasks */}
        <DoneTasksDropdown
          tasks={allMyTasks.filter(t=>t.status==="Done")}
          onReopen={task => onSaveItem && onSaveItem({...task, status:"Not Started", projectId:task.projId, projectName:task.projName, deliverableId:task.isSubtask?(task.deliverableId||task.delId):null})}
          onDelete={()=>{}}
        />

        </div>
      </div>



      {showWorkReport && (
        <WorkReportModal
          meId={meId}
          meName={me?.name || "Me"}
          projects={projects}
          adminTasks={adminTasks}
          people={people}
          onClose={() => setShowWorkReport(false)}
        />
      )}
      {showAssignModal && (
        <AssignTaskModal
          people={people}
          editing={editingAdminTask}
          onClose={() => { setShowAssignModal(false); setEditingAdminTask(null); }}
          onSave={(task) => onSaveAdminTask({ ...task, assignedBy: authMemberId })}
        />
      )}
    </div>
  );
}



// --- STATUS VIEW ─────────────────────────────────────────────────────────────

function getTrackStatus(del) {
  if (del.status === "Done")    return "done";
  if (del.status === "Blocked") return "blocked";

  const today    = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toLocaleDateString("en-CA");

  // Off Track: deliverable end date has passed and it is not Done
  if (del.end && del.end < todayStr) return "off-track";

  const subs = del.subtasks || [];

  // No subtasks: on track as long as end date has not passed
  if (subs.length === 0) return "on-track";

  // The ONLY factual signals used:
  //   overdue = task whose end date has passed and is not Done
  //   blocked = task explicitly marked Blocked
  // Nothing else. No predictions. No timeline comparisons. No percent math.
  const overdue = subs.filter(s => s.status !== "Done" && s.end && s.end < todayStr);
  const blocked = subs.filter(s => s.status === "Blocked");

  // Off Track: multiple overdue tasks, OR overdue + blocked
  if (overdue.length >= 2)                        return "off-track";
  if (overdue.length >= 1 && blocked.length >= 1) return "off-track";

  // At Risk: exactly one overdue task, OR any blocked task
  if (overdue.length === 1) return "at-risk";
  if (blocked.length >= 1)  return "at-risk";

  // On Track: zero overdue, zero blocked — regardless of what future work
  // is scheduled or how much has been completed so far.
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

// ── Shared health metadata used by ReportingDrawer and AtRiskProjRow ──────────
const RISK_HEALTH_META = {
  "healthy":         { label: "Healthy",         color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  "watch":           { label: "Watch",            color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  "needs-attention": { label: "Needs Attention",  color: "#f97316", bg: "rgba(249,115,22,0.12)"  },
  "on-track":        { label: "On Track",         color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  "at-risk":         { label: "At Risk",          color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  "off-track":       { label: "Off Track",        color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  "blocked":         { label: "Blocked",          color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

function ReportingDrawer({ drawer, setDrawer }) {
  if (!drawer) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:2000, display:"flex", alignItems:"flex-start", justifyContent:"flex-end" }}
      onClick={e => e.target===e.currentTarget && setDrawer(null)}>
      <div style={{ width:"min(520px, 96vw)", height:"100vh", maxHeight:"100vh", background:"#fff", boxShadow:"-4px 0 24px rgba(0,0,0,0.12)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 14px", borderBottom:"1px solid rgba(0,0,0,0.07)", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:"#1f2937" }}>{drawer.title}</div>
              <div style={{ fontSize:11, color:"#6b7280", marginTop:3 }}>{drawer.subtitle}</div>
            </div>
            <button onClick={()=>setDrawer(null)} style={{ background:"none", border:"none", fontSize:20, color:"#9ca3af", cursor:"pointer", lineHeight:1, padding:4 }}>×</button>
          </div>
          <div style={{ marginTop:10, fontSize:22, fontWeight:900, color:BRAND_TEAL }}>
            {drawer.rows?.length ?? 0} <span style={{ fontSize:11, color:"#9ca3af", fontWeight:600 }}>{drawer.unit||"items"}</span>
          </div>
        </div>
        {/* Body — scrollable independently of the header */}
        <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", padding:"14px 24px", minHeight:0, WebkitOverflowScrolling:"touch" }}>
          {drawer.note && <div style={{ fontSize:10, color:"#9ca3af", background:"rgba(0,0,0,0.03)", borderRadius:6, padding:"7px 10px", marginBottom:12 }}>ℹ {drawer.note}</div>}
          {drawer.rows?.length === 0 && <div style={{ fontSize:12, color:"#9ca3af", padding:"20px 0", textAlign:"center" }}>No items to show.</div>}
          {drawer.renderRows ? drawer.renderRows(drawer.rows) : drawer.rows?.map((row, i) => (
            <div key={i} style={{ padding:"10px 0", borderBottom:"1px solid rgba(0,0,0,0.05)", display:"flex", flexDirection:"column", gap:4 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#1f2937", flex:1 }}>{row.primary}</span>
                {row.badge && (() => { const m=RISK_HEALTH_META[row.badge]||RISK_HEALTH_META["on-track"]; return <span style={{ fontSize:9, fontWeight:700, color:m.color, background:m.bg, borderRadius:4, padding:"2px 7px" }}>{m.label}</span>; })()}
                {row.right && <span style={{ fontSize:10, color:"#9ca3af", flexShrink:0 }}>{row.right}</span>}
              </div>
              {row.secondary && <div style={{ fontSize:10, color:"#6b7280", display:"flex", gap:5, flexWrap:"wrap" }}>
                {row.secondary.map((s,j) => <span key={j}>{s}</span>)}
              </div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AtRiskProjRow — standalone so React hooks are valid ──────────────────────
function AtRiskProjRow({ p, activeDels, offTrackDels, atRiskDels, projHealth }) {
  const [open, setOpen] = React.useState(false);
  const todayStr = new Date().toLocaleDateString("en-CA");
  const today    = new Date(); today.setHours(0,0,0,0);
  const hm = RISK_HEALTH_META[projHealth] || RISK_HEALTH_META["watch"];
  const delRows = [
    ...offTrackDels.map(d => ({ d, health: "off-track" })),
    ...atRiskDels.map(d =>   ({ d, health: "at-risk"   })),
  ];
  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "11px 0", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1f2937", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
          <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
            {p.client || "No client"} ·{" "}
            <span style={{ color: "#ef4444", fontWeight: 600 }}>{offTrackDels.length} off-track</span>
            {atRiskDels.length > 0 && <span style={{ color: "#fbbf24", fontWeight: 600 }}> · {atRiskDels.length} at risk</span>}
            {" · "}{activeDels.length} active deliverable{activeDels.length !== 1 ? "s" : ""}
          </div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, color: hm.color, background: hm.bg, borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>{hm.label}</span>
        <span style={{ fontSize: 11, color: "#9ca3af", transition: "transform 0.15s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
      </div>
      {open && (
        <div style={{ background: "rgba(0,0,0,0.02)", borderRadius: 6, margin: "0 0 10px 18px", padding: "6px 0" }}>
          {delRows.length === 0
            ? <div style={{ fontSize: 10, color: "#9ca3af", padding: "6px 12px" }}>No off-track or at-risk deliverables found.</div>
            : delRows.map(({ d, health }, j) => {
                const dm = RISK_HEALTH_META[health];
                const daysOverdue = health === "off-track" && d.end && d.end < todayStr
                  ? Math.ceil((today - new Date(d.end + "T00:00:00")) / 86400000) : null;
                const signal = d.trackOverride ? `Manual override: ${d.trackOverride}`
                  : daysOverdue ? `${daysOverdue}d overdue`
                  : health === "at-risk"
                    ? (d.subtasks?.length > 0
                        ? `${d.subtasks.filter(s=>s.status==="Done").length}/${d.subtasks.length} subtasks done`
                        : "Behind schedule")
                    : "";
                return (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 12px", borderTop: j > 0 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                    <div style={{ width: 3, minHeight: 28, background: dm.color, borderRadius: 2, flexShrink: 0, alignSelf: "stretch" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
                      <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {signal && <span style={{ color: dm.color, fontWeight: 600 }}>{signal}</span>}
                        {d.end && <span>Due {d.end.slice(5)}</span>}
                        {d.status && <span>{d.status}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: dm.color, background: dm.bg, borderRadius: 4, padding: "2px 6px", flexShrink: 0 }}>{dm.label}</span>
                  </div>
                );
              })
          }
          {activeDels.length > delRows.length && (
            <div style={{ fontSize: 9, color: "#34d399", padding: "5px 12px", fontWeight: 600 }}>
              ✓ {activeDels.length - delRows.length} deliverable{activeDels.length - delRows.length !== 1 ? "s" : ""} on track
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── REPORTING DASHBOARD v2 ───────────────────────────────────────────────────
// ── ReportExportCenter — embedded in Reporting tab ───────────────────────────
function ReportExportCenter({ projects, people, pto, adminTasks, holidays }) {
  const [reportType,   setReportType]   = React.useState("dashboard");
  const [format,       setFormat]       = React.useState("excel");
  const [rangeKey,     setRangeKey]     = React.useState("30d");
  const [customStart,  setCustomStart]  = React.useState("");
  const [customEnd,    setCustomEnd]    = React.useState("");
  const [personId,     setPersonId]     = React.useState(people[0]?.id || "");
  const [projectId,    setProjectId]    = React.useState(projects[0]?.id || "");
  const [department,   setDepartment]   = React.useState("");
  const [generating,   setGenerating]   = React.useState(false);
  const [progress,     setProgress]     = React.useState("");
  const [error,        setError]        = React.useState("");
  const [success,      setSuccess]      = React.useState(false);

  const DEPARTMENTS = ["Editorial","Design","Proof","Strategy","Account","Production","Client Review"];

  const REPORT_TYPES = [
    { value:"person",     label:"Person Report",              icon:"◎", desc:"Individual workload & forecast for 1:1s" },
    { value:"department", label:"Department Report",          icon:"◈", desc:"Work type breakdown & resource view" },
    { value:"team",       label:"Team Report",                icon:"▦", desc:"Full team capacity & workload overview" },
    { value:"project",    label:"Project Report",             icon:"▬", desc:"Deliverables, tasks & health for one project" },
    { value:"capacity",   label:"Capacity Report",            icon:"⊙", desc:"Hours, targets & utilization by person" },
    { value:"health",     label:"Project Health Report",      icon:"◉", desc:"On track, at risk & off track breakdown" },
    { value:"forecast",   label:"Forecasting Report",         icon:"◈", desc:"Annual hour forecasts vs targets" },
    { value:"dashboard",  label:"Dashboard Summary",          icon:"⊞", desc:"Executive summary of all reporting" },
    { value:"all",        label:"Export All Reporting Data",  icon:"↓", desc:"Full multi-tab Excel workbook" },
  ];

  const needsPerson     = reportType === "person";
  const needsProject    = reportType === "project";
  const needsDepartment = reportType === "department";
  const needsRange      = !["capacity","health","forecast","all"].includes(reportType);
  const onlyExcel       = reportType === "all";

  const handleGenerate = async () => {
    setError(""); setSuccess(false); setGenerating(true);
    try {
      const { generateReport } = await import("./lib/reportExport.js");
      await generateReport({
        type: reportType,
        format: onlyExcel ? "excel" : format,
        data: { projects, people, pto, adminTasks, holidays },
        filters: { personId, projectId, department, rangeKey, customStart, customEnd },
        onProgress: setProgress,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (e) {
      setError(e.message || "Export failed. Check your filters and try again.");
    } finally {
      setGenerating(false); setProgress("");
    }
  };

  const sel = { fontSize:12, border:"1px solid rgba(0,0,0,0.12)", borderRadius:7, padding:"7px 10px", fontFamily:"inherit", background:"#fff", color:"#1f2937", cursor:"pointer" };
  const lbl = { fontSize:10, fontWeight:700, color:"#6b7280", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:4, display:"block" };

  return (
    <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:12, overflow:"hidden", marginBottom:4 }}>
      {/* Header */}
      <div style={{ padding:"14px 20px", background:"linear-gradient(135deg,#002A4E 0%,#004080 100%)", display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:18, color:"#50C0C0" }}>↓</span>
        <div>
          <div style={{ fontSize:14, fontWeight:800, color:"#fff" }}>Export Reports</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)" }}>Generate professional reports for leadership, planning, and 1:1s</div>
        </div>
      </div>

      <div style={{ padding:"16px 20px", display:"flex", flexDirection:"column", gap:14 }}>
        {/* Report type selector */}
        <div>
          <span style={lbl}>Report Type</span>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
            {REPORT_TYPES.map(r => (
              <button key={r.value} type="button" onClick={() => { setReportType(r.value); if(r.value==="all") setFormat("excel"); }}
                style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"9px 12px", borderRadius:8, border:`2px solid ${reportType===r.value?"#50C0C0":"rgba(0,0,0,0.08)"}`, background:reportType===r.value?"rgba(80,192,192,0.06)":"#fafafa", cursor:"pointer", fontFamily:"inherit", textAlign:"left", transition:"all 0.12s" }}>
                <span style={{ fontSize:14, color:reportType===r.value?"#50C0C0":"#9ca3af", flexShrink:0, marginTop:1 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:reportType===r.value?"#002A4E":"#374151" }}>{r.label}</div>
                  <div style={{ fontSize:10, color:"#9ca3af", marginTop:1 }}>{r.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Filters row */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
          {needsPerson && (
            <div style={{ flex:"1 1 160px" }}>
              <label style={lbl}>Team Member</label>
              <select value={personId} onChange={e=>setPersonId(e.target.value)} style={{ ...sel, width:"100%" }}>
                {people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          {needsProject && (
            <div style={{ flex:"1 1 200px" }}>
              <label style={lbl}>Project</label>
              <select value={projectId} onChange={e=>setProjectId(e.target.value)} style={{ ...sel, width:"100%" }}>
                {projects.filter(p=>!p.archived).map(p=><option key={p.id} value={p.id}>{p.name}{p.client?" — "+p.client:""}</option>)}
              </select>
            </div>
          )}
          {needsDepartment && (
            <div style={{ flex:"1 1 160px" }}>
              <label style={lbl}>Department</label>
              <select value={department} onChange={e=>setDepartment(e.target.value)} style={{ ...sel, width:"100%" }}>
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          {needsRange && (
            <div style={{ flex:"1 1 160px" }}>
              <label style={lbl}>Date Range</label>
              <select value={rangeKey} onChange={e=>setRangeKey(e.target.value)} style={{ ...sel, width:"100%" }}>
                <option value="7d">Next 7 days</option>
                <option value="30d">Next 30 days</option>
                <option value="60d">Next 60 days</option>
                <option value="qtd">Current Quarter</option>
                <option value="ytd">Full Year</option>
                <option value="custom">Custom range</option>
              </select>
            </div>
          )}
          {rangeKey === "custom" && needsRange && (
            <>
              <div style={{ flex:"1 1 130px" }}>
                <label style={lbl}>Start Date</label>
                <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} style={{ ...sel, width:"100%", boxSizing:"border-box" }} />
              </div>
              <div style={{ flex:"1 1 130px" }}>
                <label style={lbl}>End Date</label>
                <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} style={{ ...sel, width:"100%", boxSizing:"border-box" }} />
              </div>
            </>
          )}
          {!onlyExcel && (
            <div style={{ flex:"1 1 140px" }}>
              <label style={lbl}>Format</label>
              <div style={{ display:"flex", gap:6 }}>
                {["excel","pdf","csv"].map(f=>(
                  <button key={f} type="button" onClick={()=>setFormat(f)}
                    style={{ flex:1, padding:"7px 0", borderRadius:6, border:`2px solid ${format===f?"#50C0C0":"rgba(0,0,0,0.1)"}`, background:format===f?"rgba(80,192,192,0.08)":"#fff", color:format===f?"#002A4E":"#6b7280", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", textTransform:"uppercase" }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}
          {onlyExcel && (
            <div style={{ flex:"1 1 140px" }}>
              <label style={lbl}>Format</label>
              <div style={{ padding:"8px 12px", borderRadius:6, background:"rgba(80,192,192,0.08)", border:"2px solid #50C0C0", fontSize:11, fontWeight:700, color:"#002A4E", textAlign:"center" }}>EXCEL (Multi-tab)</div>
            </div>
          )}
          {/* Generate button */}
          <div style={{ flex:"0 0 auto", alignSelf:"flex-end" }}>
            <button type="button" onClick={handleGenerate} disabled={generating}
              style={{ padding:"8px 24px", borderRadius:7, border:"none", background:generating?"#9ca3af":"#50C0C0", color:"#002A4E", fontSize:13, fontWeight:800, cursor:generating?"not-allowed":"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
              {generating ? (progress || "Generating…") : "↓ Generate Report"}
            </button>
          </div>
        </div>

        {error   && <div style={{ fontSize:12, color:"#ef4444", background:"rgba(239,68,68,0.08)", borderRadius:6, padding:"8px 12px" }}>{error}</div>}
        {success && <div style={{ fontSize:12, color:"#059669", background:"rgba(5,150,105,0.08)", borderRadius:6, padding:"8px 12px" }}>✓ Report downloaded successfully.</div>}
      </div>
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// KPI DASHBOARD — Admin only
// Measures PulseX adoption, data quality, workflow, and system value.
// NOT an employee scorecard — focus is platform health and improvement.
// ─────────────────────────────────────────────────────────────────────────────

function Sparkline({ data = [], color = "#0ea5e9", width = 80, height = 32, fill = false }) {
  const w = typeof width === "number" ? width : 80;
  const h = typeof height === "number" ? height : 32;
  if (!data || data.length < 2) {
    return <svg width={w} height={h}><line x1={0} y1={h/2} x2={w} y2={h/2} stroke="#e5e7eb" strokeWidth={1} /></svg>;
  }
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 4 - ((v - min) / range) * (h - 8),
  ]);
  const polyline = pts.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fillPath = fill
    ? `M${pts[0][0]},${h} ` + pts.map(([x,y]) => `L${x},${y}`).join(" ") + ` L${pts[pts.length-1][0]},${h} Z`
    : null;
  return (
    <svg width={w} height={h} style={{ display:"block", overflow:"visible" }}>
      {fill && <path d={fillPath} fill={color + "20"} />}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function KPIMetricCard({ label, value, sub, desc, trend, trendLabel, color = "#0ea5e9", sparkData, icon, warning }) {
  const trendUp   = typeof trend === "number" && trend > 0;
  const trendDown = typeof trend === "number" && trend < 0;
  const trendColor = trendUp ? "#10b981" : trendDown ? "#f87171" : "#9ca3af";
  return (
    <div style={{ background:"#fff", borderWidth:"1px", borderStyle:"solid", borderColor:`${warning ? "#fde68a" : "rgba(0,0,0,0.08)"}`, borderTopWidth:"3px", borderTopColor:`${warning ? "#f59e0b" : color}`, borderRadius:8, padding:"14px 16px", minWidth:0 }}>
      <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>
        {icon && <span style={{ marginRight:5 }}>{icon}</span>}{label}
      </div>
      <div style={{ fontSize:24, fontWeight:900, color: warning ? "#f59e0b" : color, lineHeight:1 }}>{value}</div>
      {sub    && <div style={{ fontSize:11, color:"#6b7280", marginTop:3 }}>{sub}</div>}
      {desc   && <div style={{ fontSize:10, color:"#9ca3af", marginTop:4, lineHeight:1.4, borderTop:"1px solid rgba(0,0,0,0.05)", paddingTop:6 }}>{desc}</div>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
        {typeof trend === "number" ? (
          <span style={{ fontSize:11, fontWeight:700, color:trendColor }}>
            {trendUp ? "↑" : trendDown ? "↓" : "→"} {Math.abs(trend).toFixed(1)}{trendLabel || ""}
          </span>
        ) : <span />}
        {sparkData && <Sparkline data={sparkData} color={color} width={72} height={28} fill />}
      </div>
    </div>
  );
}

function KPISection({ title, children }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:10, overflow:"hidden" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px", cursor:"pointer", background:"#f8fafc", borderBottom: open ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
        <span style={{ fontSize:13, fontWeight:800, color:"#1f2937" }}>{title}</span>
        <span style={{ fontSize:12, color:"#9ca3af" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && <div style={{ padding:"18px" }}>{children}</div>}
    </div>
  );
}

function KPIDashboardView({ projects, people, notifications, adminTasks = [], sb, SB_READY, authMemberId }) {
  const [snapshots,    setSnapshots]    = React.useState([]);
  const [activity,     setActivity]     = React.useState([]);
  const [dateRange,    setDateRange]    = React.useState("30d");
  const [exporting,    setExporting]    = React.useState(false);
  const [snapshotSaved,setSnapshotSaved]= React.useState(false);

  const today     = new Date(); today.setHours(0,0,0,0);
  const todayStr  = today.toISOString().slice(0,10);
  const EFFORT_HRS = { S:1, M:4, L:8 };
  const eHrs = t => Number(t.customHours) || EFFORT_HRS[t.effort] || 4;

  // ── Derived data ─────────────────────────────────────────────────────────
  const activeProjects  = projects.filter(p => !p.archived);
  const allDels         = activeProjects.flatMap(p => p.deliverables);
  const allTasks        = activeProjects.flatMap(p =>
    p.deliverables.flatMap(d => d.subtasks.length > 0 ? d.subtasks : [d])
  );
  const openTasks       = allTasks.filter(t => t.status !== "Done");
  const doneTasks       = allTasks.filter(t => t.status === "Done");
  const totalHrs        = allTasks.reduce((s,t) => s+eHrs(t), 0);
  const assignedHrs     = openTasks.reduce((s,t) => s + ((t.assignees||[]).length > 0 ? eHrs(t) : 0), 0);

  // ── Visibility Score ──────────────────────────────────────────────────────
  const visibilityScore = React.useMemo(() => {
    if (!activeProjects.length) return 0;
    let totalPts = 0, maxPts = 0;
    activeProjects.forEach(proj => {
      const tasks = proj.deliverables.flatMap(d => d.subtasks.length > 0 ? d.subtasks : [d]);
      const open  = tasks.filter(t => t.status !== "Done");
      const pts = [
        proj.client                           ? 10 : 0,
        proj.deliverables.length > 0          ? 15 : 0,
        tasks.length > 0                      ? 15 : 0,
        open.length === 0 || open.every(t => (t.assignees||[]).length > 0)  ? 20 : Math.round(20 * open.filter(t=>(t.assignees||[]).length>0).length / open.length),
        open.length === 0 || open.every(t => t.end)  ? 20 : Math.round(20 * open.filter(t=>t.end).length / open.length),
        open.length === 0 || open.every(t => t.effort || t.customHours) ? 10 : Math.round(10 * open.filter(t=>t.effort||t.customHours).length / open.length),
        proj.ownerId ? 10 : 0,
      ];
      totalPts += pts.reduce((s,v) => s+v, 0);
      maxPts   += 100;
    });
    return maxPts > 0 ? Math.round((totalPts / maxPts) * 100) : 0;
  }, [activeProjects]);

  // ── Planning Completeness ─────────────────────────────────────────────────
  const planningScore = React.useMemo(() => {
    if (!activeProjects.length) return 0;
    let pts = 0, max = 0;
    activeProjects.forEach(proj => {
      max += 4;
      if (proj.ownerId) pts++;
      if (proj.deliverables.length > 0) pts++;
      const delsWithDates = proj.deliverables.filter(d => d.start && d.end).length;
      if (proj.deliverables.length === 0 || delsWithDates / proj.deliverables.length >= 0.75) pts++;
      const tasks = proj.deliverables.flatMap(d => d.subtasks.length > 0 ? d.subtasks : [d]);
      if (tasks.length > 0) pts++;
    });
    return Math.round((pts / max) * 100);
  }, [activeProjects]);

  // ── Forecast Coverage ─────────────────────────────────────────────────────
  const forecastCov = allTasks.length > 0
    ? Math.round(allTasks.filter(t => t.effort || t.customHours).length / allTasks.length * 100) : 0;

  // ── Capacity Visibility ───────────────────────────────────────────────────
  const capacityVis = totalHrs > 0 ? Math.round((assignedHrs / totalHrs) * 100) : 0;

  // ── Missing data ──────────────────────────────────────────────────────────
  const missingOwners = openTasks.filter(t => !(t.assignees||[]).length).length;
  const missingDates  = openTasks.filter(t => !t.end).length;
  const missingEffort = openTasks.filter(t => !t.effort && !t.customHours).length;
  const missingOwnersPct = openTasks.length ? Math.round(missingOwners/openTasks.length*100) : 0;
  const missingDatesPct  = openTasks.length ? Math.round(missingDates/openTasks.length*100)  : 0;

  // ── Stale projects ────────────────────────────────────────────────────────
  const staleProjects = React.useMemo(() => {
    return activeProjects.map(proj => {
      const allProjTasks = proj.deliverables.flatMap(d => d.subtasks.length > 0 ? d.subtasks : [d]);
      const dates = allProjTasks.flatMap(t => [t.start, t.end]).filter(Boolean).sort();
      const latest = dates.length ? new Date(dates[dates.length-1] + "T00:00:00") : null;
      const daysSince = latest ? Math.floor((today - latest) / 86400000) : 999;
      return { ...proj, lastActivity: dates[dates.length-1] || null, daysSince };
    }).sort((a,b) => b.daysSince - a.daysSince);
  }, [activeProjects]);

  // ── Avg task cycle time ───────────────────────────────────────────────────
  const avgCycleTime = React.useMemo(() => {
    const valid = doneTasks.filter(t => t.start && t.end && t.end > t.start);
    if (!valid.length) return null;
    const days = valid.map(t => Math.ceil((new Date(t.end+"T00:00:00") - new Date(t.start+"T00:00:00")) / 86400000));
    const avg  = days.reduce((s,d) => s+d, 0) / days.length;
    const sorted = [...days].sort((a,b) => a-b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length/2-1] + sorted[sorted.length/2]) / 2
      : sorted[Math.floor(sorted.length/2)];
    return { avg: Math.round(avg * 10) / 10, median: Math.round(median * 10) / 10, count: valid.length };
  }, [doneTasks]);

  // ── Reporting / Health coverage ───────────────────────────────────────────
  const eligible = activeProjects.filter(p => {
    const tasks = p.deliverables.flatMap(d => d.subtasks.length>0?d.subtasks:[d]);
    return tasks.length > 0 && p.deliverables.some(d => d.end) && p.deliverables.some(d => (d.assignees||[]).length > 0);
  });
  const reportingCov    = activeProjects.length ? Math.round(eligible.length/activeProjects.length*100) : 0;
  const healthEligible  = activeProjects.filter(p => p.deliverables.length > 0 && p.deliverables.some(d => d.end));
  const healthCov       = activeProjects.length ? Math.round(healthEligible.length/activeProjects.length*100) : 0;

  // ── Low-visibility projects ───────────────────────────────────────────────
  const projectScores = React.useMemo(() => {
    return activeProjects.map(proj => {
      const tasks = proj.deliverables.flatMap(d => d.subtasks.length>0?d.subtasks:[d]);
      const open  = tasks.filter(t => t.status !== "Done");
      let pts = 0;
      if (proj.client)                pts += 10;
      if (proj.deliverables.length)   pts += 15;
      if (tasks.length)               pts += 15;
      if (!open.length || open.every(t=>(t.assignees||[]).length>0)) pts += 20;
      else pts += Math.round(20 * open.filter(t=>(t.assignees||[]).length>0).length / open.length);
      if (!open.length || open.every(t=>t.end)) pts += 20;
      else pts += Math.round(20 * open.filter(t=>t.end).length / open.length);
      if (!open.length || open.every(t=>t.effort||t.customHours)) pts += 10;
      else pts += Math.round(10 * open.filter(t=>t.effort||t.customHours).length / open.length);
      if (proj.ownerId) pts += 10;
      return { ...proj, score: pts };
    }).sort((a,b) => a.score - b.score);
  }, [activeProjects]);

  // ── Load snapshots + activity from Supabase ───────────────────────────────
  React.useEffect(() => {
    if (!SB_READY) return;

    // Load last 12 months of snapshots
    const since = new Date(today); since.setFullYear(since.getFullYear()-1);
    sb.select("kpi_snapshots", `snapshot_date=gte.${since.toISOString().slice(0,10)}&order=snapshot_date.asc&limit=400`)
      .then(r => { if (r.data) setSnapshots(r.data); })
      .catch(() => {});

    // Load activity last 90 days
    const act90 = new Date(today); act90.setDate(act90.getDate()-90);
    sb.select("user_activity", `occurred_at=gte.${act90.toISOString()}&order=occurred_at.desc&limit=2000`)
      .then(r => { if (r.data) setActivity(r.data); })
      .catch(() => {});
  }, [SB_READY]);

  // Ref guard — prevents React Strict Mode double-invocation from writing duplicate snapshots
  const snapshotInFlight = React.useRef(false);


  // ── Auto-capture snapshot if none for today ───────────────────────────────
  React.useEffect(() => {
    if (!SB_READY || snapshotSaved || snapshotInFlight.current) return;
    const hasTodaySnapshot = snapshots.some(s => s.snapshot_date === todayStr);
    if (hasTodaySnapshot) return;

    // Derive active users from activity
    const d7  = new Date(today); d7.setDate(d7.getDate()-7);
    const d30 = new Date(today); d30.setDate(d30.getDate()-30);
    const active7  = new Set(activity.filter(a => new Date(a.occurred_at) >= d7 ).map(a => a.person_id)).size;
    const active30 = new Set(activity.filter(a => new Date(a.occurred_at) >= d30).map(a => a.person_id)).size;

    const stale7  = staleProjects.filter(p => p.daysSince >= 7).length;
    const stale14 = staleProjects.filter(p => p.daysSince >= 14).length;
    const stale30 = staleProjects.filter(p => p.daysSince >= 30).length;

    const snapshot = {
      snapshot_date:            todayStr,
      active_users_7d:          active7,
      active_users_30d:         active30,
      total_users:              people.length,
      visibility_score:         visibilityScore,
      tasks_missing_owners:     missingOwners,
      tasks_missing_dates:      missingDates,
      tasks_missing_effort:     missingEffort,
      stale_projects_7d:        stale7,
      stale_projects_14d:       stale14,
      stale_projects_30d:       stale30,
      planning_completeness:    planningScore,
      forecast_coverage:        forecastCov,
      capacity_visibility:      capacityVis,
      avg_task_cycle_time_days: avgCycleTime?.avg || null,
      reporting_coverage:       reportingCov,
      project_health_coverage:  healthCov,
      total_projects:           projects.length,
      total_active_projects:    activeProjects.length,
      total_tasks:              allTasks.length,
      total_open_tasks:         openTasks.length,
      total_deliverables:       allDels.length,
    };

    snapshotInFlight.current = true;
    sb.upsert("kpi_snapshots", snapshot).then(r => {
      // 409 = snapshot for today already exists (e.g. Strict Mode double-invoke) — treat as success
      if (!r?.error || r?.status === 409) {
        setSnapshots(prev => [...prev.filter(s => s.snapshot_date !== todayStr), snapshot]);
        setSnapshotSaved(true);
      } else { snapshotInFlight.current = false; }
    }).catch(() => { snapshotInFlight.current = false; });
  }, [SB_READY, snapshots.length, snapshotSaved]);

  // ── Date range helpers ────────────────────────────────────────────────────
  const rangeStart = React.useMemo(() => {
    const d = new Date(today);
    if (dateRange === "7d")  { d.setDate(d.getDate()-7);       return d.toISOString().slice(0,10); }
    if (dateRange === "30d") { d.setDate(d.getDate()-30);      return d.toISOString().slice(0,10); }
    if (dateRange === "90d") { d.setDate(d.getDate()-90);      return d.toISOString().slice(0,10); }
    if (dateRange === "1y")  { d.setFullYear(d.getFullYear()-1); return d.toISOString().slice(0,10); }
    if (dateRange === "ytd") { return `${today.getFullYear()}-01-01`; }
    return new Date(today.getTime()-30*86400000).toISOString().slice(0,10);
  }, [dateRange]);

  const filteredSnaps = snapshots.filter(s => s.snapshot_date >= rangeStart);
  const sparkVis      = filteredSnaps.map(s => Number(s.visibility_score||0));
  const sparkPlan     = filteredSnaps.map(s => Number(s.planning_completeness||0));
  const sparkForecast = filteredSnaps.map(s => Number(s.forecast_coverage||0));
  const sparkCap      = filteredSnaps.map(s => Number(s.capacity_visibility||0));
  const sparkActive7  = filteredSnaps.map(s => Number(s.active_users_7d||0));

  // Trend = change vs start of period
  const trend = (arr) => arr.length >= 2 ? arr[arr.length-1] - arr[0] : null;

  // ── Activity-derived metrics ──────────────────────────────────────────────
  const actD7   = activity.filter(a => { const d = new Date(a.occurred_at); return d >= new Date(today.getTime()-7*86400000); });
  const actD30  = activity.filter(a => { const d = new Date(a.occurred_at); return d >= new Date(today.getTime()-30*86400000); });
  const active7d  = new Set(actD7.map(a => a.person_id)).size;
  const active30d = new Set(actD30.map(a => a.person_id)).size;

  const loginEvents = actD30.filter(a => a.event_type === "login");
  const avgLogins   = people.length > 0 ? (loginEvents.length / people.length).toFixed(1) : "—";

  const featureCounts = ["myhub","dashboard","timeline","people","status","workload","reporting","history"].map(f => ({
    feature: f,
    label: { myhub:"My Hub", dashboard:"Dashboard", timeline:"Timeline", people:"By Person", status:"Status", workload:"Workload", reporting:"Reporting", history:"History" }[f] || f,
    views: actD30.filter(a => a.event_type === `view_${f}`).length,
    users: new Set(actD30.filter(a => a.event_type === `view_${f}`).map(a => a.person_id)).size,
  })).sort((a,b) => b.views - a.views);

  // Login recency per person
  const lastLogin = people.map(p => {
    const events = activity.filter(a => a.person_id === p.id && a.event_type === "login");
    const last = events.sort((a,b) => b.occurred_at.localeCompare(a.occurred_at))[0];
    const daysAgo = last ? Math.floor((today - new Date(last.occurred_at)) / 86400000) : null;
    return { ...p, lastEvent: last?.occurred_at || null, daysAgo };
  }).sort((a,b) => (a.daysAgo ?? 9999) - (b.daysAgo ?? 9999));

  // ── Excel export ──────────────────────────────────────────────────────────
  const exportExcel = async () => {
    setExporting(true);
    try {
      let XLSX = window.XLSX;
      if (!XLSX) {
        await new Promise((res,rej) => { const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
        XLSX = window.XLSX;
      }
      const wb = XLSX.utils.book_new();

      // Current KPIs
      const currentRows = [
        ["KPI","Value","Category"],
        ["Visibility Score", visibilityScore+"%", "Data Quality"],
        ["Planning Completeness", planningScore+"%", "Workflow"],
        ["Forecast Coverage", forecastCov+"%", "Workflow"],
        ["Capacity Visibility", capacityVis+"%", "Workflow"],
        ["Reporting Coverage", reportingCov+"%", "System Value"],
        ["Project Health Coverage", healthCov+"%", "System Value"],
        ["Active Users (7d)", active7d, "Adoption"],
        ["Active Users (30d)", active30d, "Adoption"],
        ["Tasks Missing Owners", missingOwners + " ("+missingOwnersPct+"%)", "Data Quality"],
        ["Tasks Missing Dates", missingDates + " ("+missingDatesPct+"%)", "Data Quality"],
        ["Avg Task Cycle Time", avgCycleTime ? avgCycleTime.avg+"d" : "—", "Workflow"],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(currentRows);
      ws1["!cols"] = [30,20,20].map(w=>({wch:w}));
      XLSX.utils.book_append_sheet(wb, ws1, "Current KPIs");

      // Historical snapshots
      if (filteredSnaps.length > 0) {
        const histRows = [["Date","Visibility","Planning","Forecast","Capacity","Active 7d","Active 30d","Missing Owners","Missing Dates","Stale 7d","Stale 30d"]];
        filteredSnaps.forEach(s => histRows.push([
          s.snapshot_date, s.visibility_score, s.planning_completeness, s.forecast_coverage,
          s.capacity_visibility, s.active_users_7d, s.active_users_30d,
          s.tasks_missing_owners, s.tasks_missing_dates, s.stale_projects_7d, s.stale_projects_30d,
        ]));
        const ws2 = XLSX.utils.aoa_to_sheet(histRows);
        ws2["!cols"] = [12,...Array(10).fill(14)].map(w=>({wch:w}));
        XLSX.utils.book_append_sheet(wb, ws2, "Historical Trends");
      }

      // Project scores
      const projRows = [["Project","Client","Project #","Visibility Score","Has Owner","Has Deliverables","Has Tasks","Missing Owner Tasks","Missing Date Tasks"]];
      projectScores.forEach(p => {
        const tasks = p.deliverables.flatMap(d => d.subtasks.length>0?d.subtasks:[d]);
        const open  = tasks.filter(t => t.status!=="Done");
        projRows.push([p.name, p.client||"", p.projectNumber||"", p.score+"%", p.ownerId?"Yes":"No", p.deliverables.length, tasks.length, open.filter(t=>!(t.assignees||[]).length).length, open.filter(t=>!t.end).length]);
      });
      const ws3 = XLSX.utils.aoa_to_sheet(projRows);
      ws3["!cols"] = [28,16,12,...Array(6).fill(16)].map(w=>({wch:w}));
      XLSX.utils.book_append_sheet(wb, ws3, "Project Scores");

      XLSX.writeFile(wb, `kpi-dashboard-${todayStr}.xlsx`);
    } catch(e) { console.error("KPI export failed:", e); }
    setExporting(false);
  };

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const esc = v => `"${String(v||"").replace(/"/g,'""')}"`;
    const rows = [["Date","Visibility","Planning","Forecast","Capacity","Active7d","Active30d","MissingOwners","MissingDates","Stale7d","Stale30d"]];
    filteredSnaps.forEach(s => rows.push([
      s.snapshot_date,s.visibility_score,s.planning_completeness,s.forecast_coverage,
      s.capacity_visibility,s.active_users_7d,s.active_users_30d,
      s.tasks_missing_owners,s.tasks_missing_dates,s.stale_projects_7d,s.stale_projects_30d,
    ]));
    const csv = rows.map(r=>r.map(esc).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
    a.download = `kpi-trends-${todayStr}.csv`;
    a.click();
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const TEAL = "#50C0C0", NAVY = "#002A4E";
  const tblH = { fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em", padding:"6px 10px", borderBottom:"2px solid rgba(0,0,0,0.07)", textAlign:"left", background:"#f8fafc" };
  const tblC = (extra={}) => ({ fontSize:12, padding:"7px 10px", borderBottom:"1px solid rgba(0,0,0,0.05)", ...extra });
  const fmtDate = d => d ? new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "—";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18, padding:"0 0 40px" }}>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:900, color:NAVY }}>KPI Dashboard</h2>
          <p style={{ margin:"3px 0 0", fontSize:11, color:"#6b7280" }}>
            Platform health, adoption, and data quality — {activeProjects.length} active projects · {people.length} users · {allTasks.length} tasks
          </p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {/* Date range */}
          <div style={{ display:"flex", gap:2, background:"rgba(0,0,0,0.04)", borderRadius:7, padding:2 }}>
            {[["7d","7 Days"],["30d","30 Days"],["90d","90 Days"],["ytd","YTD"],["1y","1 Year"]].map(([v,l]) => (
              <button key={v} onClick={() => setDateRange(v)}
                style={{ fontSize:10, fontWeight:600, padding:"4px 10px", borderRadius:5, border:"none", cursor:"pointer", fontFamily:"inherit",
                  background: dateRange===v ? "#fff" : "none", color: dateRange===v ? NAVY : "#6b7280",
                  boxShadow: dateRange===v ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={exportCSV}   style={{ fontSize:11, fontWeight:700, padding:"7px 13px", background:"#fff", color:NAVY, border:`1px solid rgba(0,0,0,0.15)`, borderRadius:7, cursor:"pointer", fontFamily:"inherit" }}>↓ CSV</button>
          <button onClick={exportExcel} disabled={exporting}
            style={{ fontSize:11, fontWeight:700, padding:"7px 13px", background:"#1d6f42", color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontFamily:"inherit", opacity:exporting?0.7:1 }}>
            {exporting ? "Exporting…" : "↓ Excel"}
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
        <KPIMetricCard label="Visibility Score"       value={visibilityScore+"%"} color={TEAL}     icon="◉" sparkData={sparkVis}      trend={trend(sparkVis)}      trendLabel="pts"
          desc="How well-structured your projects are. Scores tasks for having owners, due dates, effort estimates, and more." />
        <KPIMetricCard label="Planning Completeness"  value={planningScore+"%"}   color="#6366f1"  icon="◈" sparkData={sparkPlan}     trend={trend(sparkPlan)}     trendLabel="pts"
          desc="% of active projects that have an owner, deliverables, dates, and tasks defined before work begins." />
        <KPIMetricCard label="Forecast Coverage"      value={forecastCov+"%"}     color="#0ea5e9"  icon="▬" sparkData={sparkForecast} trend={trend(sparkForecast)} trendLabel="pts"
          desc="% of tasks with an effort estimate (S/M/L). Higher coverage means more reliable capacity forecasting." />
        <KPIMetricCard label="Capacity Visibility"    value={capacityVis+"%"}     color="#8b5cf6"  icon="▦" sparkData={sparkCap}      trend={trend(sparkCap)}      trendLabel="pts"
          desc="% of total forecasted hours that are assigned to a specific person. Shows how much future work has a clear owner." />
        <KPIMetricCard label="Active Users (7d)"      value={activity.length > 0 ? active7d : "—"} sub={activity.length > 0 ? `of ${people.length}` : "Tracking starts now"}
          color="#f59e0b" icon="⊙" sparkData={sparkActive7} trend={null} warning={activity.length === 0}
          desc="Team members who have opened PulseX in the last 7 days. Measures day-to-day platform adoption." />
      </div>

      {/* ── Data note if no activity yet ── */}
      {activity.length === 0 && (
        <div style={{ background:"#fef9ec", border:"1px solid #fcd34d", borderRadius:8, padding:"10px 16px", fontSize:12, color:"#92400e" }}>
          📊 Activity tracking is now live. Login and feature usage data will accumulate over the coming days. User adoption metrics will populate automatically.
        </div>
      )}

      {/* ═══ 1. ADOPTION ═══ */}
      <KPISection title="1 · Adoption">
        <p style={{ margin:"0 0 16px", fontSize:12, color:"#6b7280", lineHeight:1.5 }}>
          Tracks whether the team is actively using PulseX. Adoption is the foundation — the platform only improves visibility and planning if people are using it.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:18 }}>
          <div style={{ background:"#f8fafc", borderRadius:8, padding:"14px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Active Users — 7 Days</div>
            <div style={{ fontSize:26, fontWeight:900, color:TEAL }}>{activity.length > 0 ? `${active7d} / ${people.length}` : "—"}</div>
            {activity.length > 0 && <div style={{ fontSize:11, color:"#6b7280" }}>{people.length > 0 ? Math.round(active7d/people.length*100) : 0}% of team active</div>}
          </div>
          <div style={{ background:"#f8fafc", borderRadius:8, padding:"14px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Active Users — 30 Days</div>
            <div style={{ fontSize:26, fontWeight:900, color:"#6366f1" }}>{activity.length > 0 ? `${active30d} / ${people.length}` : "—"}</div>
            {activity.length > 0 && <div style={{ fontSize:11, color:"#6b7280" }}>Avg {avgLogins} logins / person</div>}
          </div>
          <div style={{ background:"#f8fafc", borderRadius:8, padding:"14px 16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:4 }}>Snapshots Captured</div>
            <div style={{ fontSize:26, fontWeight:900, color:"#0ea5e9" }}>{snapshots.length}</div>
            <div style={{ fontSize:11, color:"#6b7280" }}>Daily KPI history</div>
          </div>
        </div>

        {/* Login recency table */}
        <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:8 }}>Last Login by User</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>
              <th style={tblH}>User</th>
              <th style={tblH}>Last Login</th>
              <th style={tblH}>Status</th>
              <th style={{ ...tblH, textAlign:"right" }}>Logins (30d)</th>
            </tr></thead>
            <tbody>
              {lastLogin.map((p, i) => {
                const logins30 = activity.filter(a => a.person_id === p.id && a.event_type === "login" && new Date(a.occurred_at) >= new Date(today.getTime()-30*86400000)).length;
                const inactive = p.daysAgo === null || p.daysAgo > 14;
                const label = p.daysAgo === null ? "No data yet" : p.daysAgo === 0 ? "Today" : p.daysAgo === 1 ? "Yesterday" : `${p.daysAgo}d ago`;
                return (
                  <tr key={p.id} style={{ background: inactive ? "rgba(248,113,113,0.05)" : i%2===0?"#fff":"rgba(0,0,0,0.01)" }}>
                    <td style={tblC()}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ width:20, height:20, borderRadius:"50%", background:p.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:800, color:"#fff" }}>
                          {p.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight:500 }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={tblC({ color: inactive ? "#f87171" : "#374151", fontWeight: inactive ? 700 : 400 })}>{label}</td>
                    <td style={tblC()}>
                      {p.daysAgo === null ? <span style={{ fontSize:10, color:"#9ca3af" }}>Not tracked yet</span>
                        : p.daysAgo <= 1  ? <span style={{ fontSize:10, fontWeight:700, color:"#10b981", background:"rgba(16,185,129,0.1)", borderRadius:3, padding:"1px 6px" }}>Active</span>
                        : p.daysAgo <= 7  ? <span style={{ fontSize:10, color:"#f59e0b", background:"rgba(245,158,11,0.1)", borderRadius:3, padding:"1px 6px" }}>Recent</span>
                        : p.daysAgo <= 14 ? <span style={{ fontSize:10, color:"#f97316", background:"rgba(249,115,22,0.1)", borderRadius:3, padding:"1px 6px" }}>Inactive</span>
                        : <span style={{ fontSize:10, fontWeight:700, color:"#f87171", background:"rgba(248,113,113,0.1)", borderRadius:3, padding:"1px 6px" }}>⚠ {p.daysAgo}d inactive</span>}
                    </td>
                    <td style={tblC({ textAlign:"right", fontVariantNumeric:"tabular-nums" })}>{logins30 || (p.daysAgo === null ? "—" : 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </KPISection>

      {/* ═══ 2. DATA QUALITY ═══ */}
      <KPISection title="2 · Data Quality">
        <p style={{ margin:"0 0 16px", fontSize:12, color:"#6b7280", lineHeight:1.5 }}>
          Measures how complete and usable the data in PulseX is. High data quality means reports are reliable, capacity is accurate, and nothing important is invisible to the team.
        </p>
        {/* Summary row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:18 }}>
          <KPIMetricCard label="Visibility Score"     value={visibilityScore+"%"} color={TEAL}    sub={`${activeProjects.length} projects scored`} sparkData={sparkVis} trend={trend(sparkVis)} trendLabel="pts"
            desc="Each project earns points for having a client, deliverables, tasks, owners, due dates, and effort sizes. 100% = fully visible." />
          <KPIMetricCard label="Tasks Missing Owners" value={missingOwners}       color="#f97316" sub={`${missingOwnersPct}% of ${openTasks.length} open tasks`} warning={missingOwnersPct > 20}
            desc="Open tasks with no one assigned. Unowned tasks create blind spots in capacity planning and scheduling." />
          <KPIMetricCard label="Tasks Missing Dates"  value={missingDates}        color="#f59e0b" sub={`${missingDatesPct}% of ${openTasks.length} open tasks`} warning={missingDatesPct > 20}
            desc="Open tasks with no due date. Missing dates make Timeline and By Person views incomplete and forecasting unreliable." />
        </div>

        {/* Project scores table */}
        <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:8 }}>Project Visibility Scores <span style={{ fontSize:10, fontWeight:400, color:"#9ca3af" }}>— lowest first</span></div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>
              <th style={tblH}>Project</th>
              <th style={tblH}>Client</th>
              <th style={{ ...tblH, width:120 }}>Score</th>
              <th style={{ ...tblH, textAlign:"right" }}>No Owner</th>
              <th style={{ ...tblH, textAlign:"right" }}>No Date</th>
              <th style={{ ...tblH, textAlign:"right" }}>No Effort</th>
            </tr></thead>
            <tbody>
              {projectScores.map((p, i) => {
                const tasks = p.deliverables.flatMap(d => d.subtasks.length>0?d.subtasks:[d]);
                const open  = tasks.filter(t => t.status!=="Done");
                const mo = open.filter(t=>!(t.assignees||[]).length).length;
                const md = open.filter(t=>!t.end).length;
                const me = open.filter(t=>!t.effort&&!t.customHours).length;
                const color = p.score >= 80 ? "#10b981" : p.score >= 60 ? "#f59e0b" : "#f87171";
                return (
                  <tr key={p.id} style={{ background: i%2===0?"#fff":"rgba(0,0,0,0.01)" }}>
                    <td style={tblC()}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ width:7, height:7, borderRadius:2, background:p.color, flexShrink:0 }} />
                        <span style={{ fontWeight:500 }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={tblC({ color:"#6b7280" })}>{p.client||"—"}</td>
                    <td style={tblC()}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ flex:1, height:5, background:"#f3f4f6", borderRadius:3 }}>
                          <div style={{ height:5, background:color, borderRadius:3, width:`${p.score}%` }} />
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color, width:36, textAlign:"right" }}>{p.score}%</span>
                      </div>
                    </td>
                    <td style={tblC({ textAlign:"right", color: mo>0?"#f87171":"#9ca3af" })}>{mo}</td>
                    <td style={tblC({ textAlign:"right", color: md>0?"#f59e0b":"#9ca3af" })}>{md}</td>
                    <td style={tblC({ textAlign:"right", color: me>0?"#9ca3af":"#10b981" })}>{me}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Stale projects */}
        {staleProjects.filter(p => p.daysSince >= 7).length > 0 && (
          <div style={{ marginTop:20 }}>
            <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:8 }}>Stale Projects <span style={{ fontSize:10, fontWeight:400, color:"#9ca3af" }}>— no task updates in 7+ days</span></div>
            <div style={{ display:"flex", gap:12, marginBottom:10 }}>
              {[7,14,30].map(d => (
                <div key={d} style={{ background:"#f8fafc", borderRadius:7, padding:"8px 14px", textAlign:"center" }}>
                  <div style={{ fontSize:18, fontWeight:900, color: d===7?"#f59e0b":d===14?"#f97316":"#f87171" }}>{staleProjects.filter(p=>p.daysSince>=d).length}</div>
                  <div style={{ fontSize:10, color:"#9ca3af" }}>{d}+ days</div>
                </div>
              ))}
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>
                <th style={tblH}>Project</th>
                <th style={tblH}>Client</th>
                <th style={tblH}>Last Activity</th>
                <th style={{ ...tblH, textAlign:"right" }}>Days Since Update</th>
              </tr></thead>
              <tbody>
                {staleProjects.filter(p=>p.daysSince>=7).map((p,i) => (
                  <tr key={p.id} style={{ background: i%2===0?"#fff":"rgba(0,0,0,0.01)" }}>
                    <td style={tblC()}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ width:7, height:7, borderRadius:2, background:p.color, flexShrink:0 }} />
                        <span style={{ fontWeight:500 }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={tblC({ color:"#6b7280" })}>{p.client||"—"}</td>
                    <td style={tblC({ color:"#6b7280" })}>{fmtDate(p.lastActivity)}</td>
                    <td style={tblC({ textAlign:"right", fontWeight:700, color: p.daysSince>=30?"#f87171":p.daysSince>=14?"#f97316":"#f59e0b" })}>
                      {p.daysSince === 999 ? "No dates set" : `${p.daysSince}d`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </KPISection>

      {/* ═══ 3. WORKFLOW METRICS ═══ */}
      <KPISection title="3 · Workflow Metrics">
        <p style={{ margin:"0 0 16px", fontSize:12, color:"#6b7280", lineHeight:1.5 }}>
          Measures how effectively PulseX is being used to plan, estimate, and manage work. Higher scores mean more predictable delivery and better resource allocation.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:18 }}>
          <KPIMetricCard label="Planning Completeness" value={planningScore+"%"}  color="#6366f1" sparkData={sparkPlan}     trend={trend(sparkPlan)}     trendLabel="pts"
            desc="% of projects that have an owner, deliverables with dates, and tasks before work starts. Goal: plan before you build." />
          <KPIMetricCard label="Forecast Coverage"     value={forecastCov+"%"}   color="#0ea5e9" sparkData={sparkForecast} trend={trend(sparkForecast)} trendLabel="pts"
            sub={`${allTasks.filter(t=>t.effort||t.customHours).length} / ${allTasks.length} tasks`}
            desc="% of tasks with S/M/L effort sizing or custom hours. Needed to calculate capacity and workload reports accurately." />
          <KPIMetricCard label="Capacity Visibility"   value={capacityVis+"%"}   color="#8b5cf6" sparkData={sparkCap}      trend={trend(sparkCap)}      trendLabel="pts"
            sub={`${assignedHrs}h / ${totalHrs}h assigned`}
            desc="% of total estimated hours that have a named owner. Shows how much future work is properly assigned vs floating." />
          <KPIMetricCard label="Avg Cycle Time"        value={avgCycleTime ? avgCycleTime.avg+"d" : "—"} color="#f59e0b"
            sub={avgCycleTime ? `Median ${avgCycleTime.median}d · ${avgCycleTime.count} tasks` : "No completed tasks with dates"}
            desc="Average days from task start to completion. Tracks whether delivery speed is improving over time." />
        </div>

        {/* Forecast by project */}
        <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:8 }}>Forecast Coverage by Project</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {activeProjects.map(proj => {
            const tasks = proj.deliverables.flatMap(d => d.subtasks.length>0?d.subtasks:[d]);
            const withEff = tasks.filter(t => t.effort||t.customHours).length;
            const pct = tasks.length > 0 ? Math.round(withEff/tasks.length*100) : 0;
            const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#f87171";
            return (
              <div key={proj.id} style={{ background:"#f8fafc", borderRadius:6, padding:"8px 12px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <div style={{ width:7, height:7, borderRadius:2, background:proj.color, flexShrink:0 }} />
                  <span style={{ fontSize:11, fontWeight:600, color:"#1f2937", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{proj.name}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ flex:1, height:4, background:"#e5e7eb", borderRadius:2 }}>
                    <div style={{ height:4, background:color, borderRadius:2, width:`${pct}%` }} />
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, color, width:30, textAlign:"right" }}>{pct}%</span>
                </div>
                <div style={{ fontSize:9, color:"#9ca3af", marginTop:2 }}>{withEff}/{tasks.length} tasks</div>
              </div>
            );
          })}
        </div>
      </KPISection>

      {/* ═══ 4. SYSTEM VALUE ═══ */}
      <KPISection title="4 · System Value">
        <p style={{ margin:"0 0 16px", fontSize:12, color:"#6b7280", lineHeight:1.5 }}>
          Measures whether PulseX has enough data to generate meaningful reports, health scores, and capacity forecasts — the outputs the platform exists to produce.
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          <KPIMetricCard label="Reporting Coverage"      value={reportingCov+"%"}    color="#10b981"
            sub={`${eligible.length} / ${activeProjects.length} projects eligible`}
            desc="% of active projects that qualify for reporting: have tasks, due dates, and at least one assigned owner." />
          <KPIMetricCard label="Project Health Coverage" value={healthCov+"%"}        color="#0ea5e9"
            sub={`${healthEligible.length} / ${activeProjects.length} with enough data`}
            desc="% of projects with enough date information to calculate an on-track / at-risk / off-track status." />
          <KPIMetricCard label="Notifications"           value={notifications.filter(n=>n.isRead).length}
            sub={`${notifications.length} total · ${Math.round(notifications.length>0?notifications.filter(n=>n.isRead).length/notifications.length*100:0)}% open rate`}
            color="#6366f1"
            desc="Tracks whether workflow notifications (assignments, completions, ready-to-start) are being opened and acted on." />
        </div>
      </KPISection>

      {/* ═══ 5. USER BEHAVIOR ═══ */}
      <KPISection title="5 · User Behavior">
        <p style={{ margin:"0 0 16px", fontSize:12, color:"#6b7280", lineHeight:1.5 }}>
          Shows which parts of PulseX the team uses most. Helps identify underused features, training opportunities, and where the platform is delivering the most value.
        </p>
        {activity.length === 0 ? (
          <div style={{ textAlign:"center", padding:"24px 0", color:"#9ca3af", fontSize:12 }}>
            Feature usage tracking is now active. Data will appear as the team uses PulseX.
          </div>
        ) : (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:10 }}>Feature Usage — Last 30 Days</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:18 }}>
              {featureCounts.map(f => (
                <div key={f.feature} style={{ background:"#f8fafc", borderRadius:7, padding:"10px 14px" }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"#374151" }}>{f.label}</div>
                  <div style={{ fontSize:20, fontWeight:900, color:TEAL, marginTop:2 }}>{f.views}</div>
                  <div style={{ fontSize:10, color:"#9ca3af" }}>views · {f.users} user{f.users!==1?"s":""}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notification engagement */}
        <div style={{ marginTop:8 }}>
          <div style={{ fontSize:12, fontWeight:700, color:NAVY, marginBottom:8 }}>Notification Engagement</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
            {["task_assigned","task_completed","task_ready"].map(type => {
              const sent   = notifications.filter(n => n.type === type).length;
              const opened = notifications.filter(n => n.type === type && n.isRead).length;
              const rate   = sent > 0 ? Math.round(opened/sent*100) : 0;
              const label  = { task_assigned:"Assigned to You", task_completed:"Task Completed", task_ready:"Ready to Start" }[type];
              return (
                <div key={type} style={{ background:"#f8fafc", borderRadius:7, padding:"10px 14px" }}>
                  <div style={{ fontSize:10, fontWeight:600, color:"#6b7280" }}>{label}</div>
                  <div style={{ fontSize:18, fontWeight:900, color:"#6366f1", marginTop:2 }}>{rate}%</div>
                  <div style={{ fontSize:10, color:"#9ca3af" }}>open rate · {opened}/{sent}</div>
                </div>
              );
            })}
          </div>
        </div>
      </KPISection>

      {/* ═══ 6. TRENDS ═══ */}
      {filteredSnaps.length >= 2 && (
        <KPISection title="6 · Historical Trends">
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {[
              { label:"Visibility Score",      key:"visibility_score",       color:TEAL    },
              { label:"Planning Completeness",  key:"planning_completeness",  color:"#6366f1"},
              { label:"Forecast Coverage",      key:"forecast_coverage",      color:"#0ea5e9"},
              { label:"Capacity Visibility",    key:"capacity_visibility",    color:"#8b5cf6"},
            ].map(({ label, key, color }) => {
              const vals  = filteredSnaps.map(s => Number(s[key]||0));
              const first = vals[0], last = vals[vals.length-1];
              const chg   = last - first;
              return (
                <div key={key} style={{ background:"#f8fafc", borderRadius:8, padding:"14px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
                      <div style={{ fontSize:22, fontWeight:900, color, lineHeight:1, marginTop:3 }}>{last.toFixed(0)}%</div>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color: chg>0?"#10b981":chg<0?"#f87171":"#9ca3af" }}>
                      {chg>0?"+":""}{chg.toFixed(1)}pts
                    </span>
                  </div>
                  <div style={{ width:"100%" }}>
                    <Sparkline data={vals} color={color} width={260} height={48} fill />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:11, color:"#9ca3af", marginTop:12, textAlign:"center" }}>
            Based on {filteredSnaps.length} daily snapshots in selected period. Snapshots are captured automatically each time this dashboard is opened.
          </div>
        </KPISection>
      )}

    </div>
  );
}


function ReportingDashboardView({ projects, people, holidays = [], pto = [], adminTasks = [] }) {
  // Export center data is passed from parent props
  const [drawer, setDrawer] = useState(null); // { title, subtitle, rows, cols, groupBy }
  const [drillClient, setDrillClient] = useState(null);
  const [sortClientCol, setSortClientCol] = useState("client");
  const [sortClientDir, setSortClientDir] = useState("asc");

  const today = new Date(); today.setHours(0,0,0,0);
  const todayStr = today.toISOString().slice(0,10);
  const holidaySet = new Set(holidays.map(h => h.date));

  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate()+n); return r.toISOString().slice(0,10); };

  // ── Derived flat data ──────────────────────────────────────────────────────
  const allDels  = projects.flatMap(p => p.deliverables.map(d => ({ ...d, proj: p })));
  const allTasks = projects.flatMap(p => p.deliverables.flatMap(d =>
    d.subtasks.length > 0
      ? d.subtasks.map(s => ({ ...s, proj: p, del: d }))
      : [{ ...d, proj: p, del: d }]
  ));
  const activeTasks = allTasks.filter(t => t.status !== "Done");

  const getMonday = (d) => {
    const day = d.getDay(), diff = day === 0 ? -6 : 1 - day;
    const m = new Date(d); m.setDate(d.getDate() + diff); m.setHours(0,0,0,0); return m;
  };

  // ── Deliverable-level health (nuanced) ────────────────────────────────────
  const delHealth = (d) => {
    if (d.status === "Done") return "done";
    if (d.trackOverride === "Off Track" || d.status === "Blocked") return "off-track";
    if (d.trackOverride === "At Risk") return "at-risk";
    const ts = getTrackStatus(d);
    if (ts === "off-track") return "off-track";
    if (ts === "at-risk")   return "at-risk";
    return "on-track";
  };

  // ── Project health — soft rollup, not one-deliverable-kills-all ───────────
  // Healthy:         all active deliverables on-track (or manual On Track)
  // Watch:           1+ at-risk OR exactly 1 off-track OR ≤25% off-track
  // Needs Attention: 2+ off-track OR >25% active dels off-track/blocked
  const projectHealth = (proj) => {
    const activeDels = proj.deliverables.filter(d => d.status !== "Done");
    if (activeDels.length === 0) return "healthy"; // all done
    const offTrack = activeDels.filter(d => delHealth(d) === "off-track").length;
    const atRisk   = activeDels.filter(d => delHealth(d) === "at-risk").length;
    const pctOff   = offTrack / activeDels.length;
    if (offTrack >= 2 || pctOff > 0.25) return "needs-attention";
    if (offTrack === 1 || atRisk >= 1)   return "watch";
    return "healthy";
  };

  // Deliverable health counts across all active projects
  const activeProjects = projects.filter(p => !p.archived);
  const delHealthCounts = { "on-track": 0, "at-risk": 0, "off-track": 0 };
  activeProjects.forEach(p => p.deliverables.filter(d => d.status !== "Done").forEach(d => {
    const h = delHealth(d);
    if (h !== "done") delHealthCounts[h === "off-track" ? "off-track" : h === "at-risk" ? "at-risk" : "on-track"]++;
  }));

  const projHealthCounts = { healthy: 0, watch: 0, "needs-attention": 0 };
  activeProjects.forEach(p => projHealthCounts[projectHealth(p)]++);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const activeClients  = new Set(activeProjects.map(p => p.client).filter(Boolean)).size;
  const thisMonthStr   = today.toISOString().slice(0,7);
  const delsDueMonthList = allDels.filter(d => d.end && d.end.startsWith(thisMonthStr) && d.status !== "Done");
  const atRiskProjList   = activeProjects.filter(p => { const h = projectHealth(p); return h === "watch" || h === "needs-attention"; });

  const weekStarts = Array.from({length:4}, (_,i) => {
    const w = new Date(getMonday(today)); w.setDate(w.getDate() + i*7); return w.toISOString().slice(0,10);
  });
  const personUtilization = people.map(person => {
    let totalPlanned = 0, totalAvail = 0;
    const weekBreakdown = weekStarts.map(ws => {
      const avail = availableHours(person.id, ws, pto, holidaySet);
      const planned = activeTasks
        .filter(t => (t.assignees||[]).includes(person.id) && t.start && t.end)
        .reduce((s,t) => {
          const ts2 = new Date(t.start+"T00:00:00"), te = new Date(t.end+"T00:00:00");
          const weeks = [];
          let cur = new Date(getMonday(ts2));
          while (cur <= te) { weeks.push(cur.toISOString().slice(0,10)); cur = new Date(cur.getTime()+7*86400000); }
          return s + (weeks.includes(ws) ? effortHours(t.effort)/Math.max(1,weeks.length) : 0);
        }, 0);
      totalPlanned += planned; totalAvail += avail;
      return { ws, planned: Math.round(planned), avail };
    });
    const utilPct = totalAvail > 0 ? Math.round((totalPlanned/totalAvail)*100) : 0;
    const topProjs = [...new Set(
      activeTasks.filter(t => (t.assignees||[]).includes(person.id)).map(t => t.proj?.name)
    )].filter(Boolean).slice(0,3);
    return { person, planned: Math.round(totalPlanned), avail: Math.round(totalAvail), utilPct, weekBreakdown, topProjs };
  }).sort((a,b) => b.utilPct - a.utilPct);

  const avgUtil    = personUtilization.length ? Math.round(personUtilization.reduce((s,p)=>s+p.utilPct,0)/personUtilization.length) : 0;
  const overloaded = personUtilization.filter(p => p.utilPct > 100);
  const maxUtil    = personUtilization[0]?.utilPct || 0;

  const totalActiveDels = activeProjects.flatMap(p=>p.deliverables).filter(d=>d.status!=="Done").length;
  const healthyPct = totalActiveDels ? Math.round((delHealthCounts["on-track"]/totalActiveDels)*100) : 100;

  const in30 = addDays(today,30), in60 = addDays(today,60), in90 = addDays(today,90);
  const forecastBuckets = [
    { label:"Next 30 Days", end:in30 }, { label:"Next 60 Days", end:in60 }, { label:"Next 90 Days", end:in90 },
  ].map(b => {
    const dels = allDels.filter(d => d.end && d.end >= todayStr && d.end <= b.end && d.status !== "Done");
    return { ...b, total:dels.length, dels,
      atRisk:  dels.filter(d => ["at-risk","off-track"].includes(delHealth(d))).length,
      blocked: dels.filter(d => d.status === "Blocked").length };
  });

  const since30 = addDays(today,-30);
  const doneTasksLast30  = allTasks.filter(t => t.status==="Done" && t.end >= since30);
  const doneDelsLast30   = allDels.filter(d => d.status==="Done" && d.end >= since30);
  const doneProjsLast30  = activeProjects.filter(p => p.deliverables.length>0 && p.deliverables.every(d=>d.status==="Done") && p.deliverables.some(d=>d.end>=since30));
  const effortDelivered  = doneTasksLast30.reduce((s,t) => s+effortHours(t.effort), 0);

  // ── Client rows ───────────────────────────────────────────────────────────
  const clientMap = {};
  activeProjects.forEach(p => {
    const c = p.client || "No Client";
    if (!clientMap[c]) clientMap[c] = { client:c, projects:[], color:p.color };
    clientMap[c].projects.push(p);
  });
  const clientRows = Object.values(clientMap).map(cm => {
    const dels  = cm.projects.flatMap(p => p.deliverables);
    const tasks = cm.projects.flatMap(p => p.deliverables.flatMap(d => d.subtasks.length ? d.subtasks : [d]));
    const hs = cm.projects.map(p => projectHealth(p));
    const health = hs.some(h=>h==="needs-attention") ? "needs-attention" : hs.some(h=>h==="watch") ? "watch" : "healthy";
    const capHrs = tasks.filter(t=>t.status!=="Done").reduce((s,t)=>s+effortHours(t.effort),0);
    return { ...cm, delCount:dels.length, taskCount:tasks.length, health, capHrs };
  }).sort((a,b) => {
    const dir = sortClientDir==="asc" ? 1 : -1;
    if (sortClientCol==="client")   return dir*a.client.localeCompare(b.client);
    if (sortClientCol==="projects") return dir*(a.projects.length-b.projects.length);
    if (sortClientCol==="health")   return dir*a.health.localeCompare(b.health);
    if (sortClientCol==="cap")      return dir*(a.capHrs-b.capHrs);
    return 0;
  });

  // ── Drawer helpers ────────────────────────────────────────────────────────
  const utilColor = (pct) => pct>120?"#ef4444":pct>100?"#f97316":pct>80?"#fbbf24":"#34d399";
  const healthMeta = {
    "healthy":         { label:"Healthy",         color:"#34d399", bg:"rgba(52,211,153,0.12)"  },
    "watch":           { label:"Watch",            color:"#fbbf24", bg:"rgba(251,191,36,0.12)"  },
    "needs-attention": { label:"Needs Attention",  color:"#f97316", bg:"rgba(249,115,22,0.12)"  },
    "on-track":        { label:"On Track",         color:"#34d399", bg:"rgba(52,211,153,0.12)"  },
    "at-risk":         { label:"At Risk",          color:"#fbbf24", bg:"rgba(251,191,36,0.12)"  },
    "off-track":       { label:"Off Track",        color:"#ef4444", bg:"rgba(239,68,68,0.12)"   },
    "blocked":         { label:"Blocked",          color:"#f87171", bg:"rgba(248,113,113,0.12)" },
  };
  const Hbadge = ({ h }) => { const m=healthMeta[h]||healthMeta["on-track"]; return <span style={{ fontSize:9, fontWeight:700, color:m.color, background:m.bg, borderRadius:4, padding:"2px 7px", whiteSpace:"nowrap" }}>{m.label}</span>; };

  // ── ReportingDetailDrawer (inline) ────────────────────────────────────────

  // ── Drill-down data builders ──────────────────────────────────────────────
  const openDelsDueMonth = () => setDrawer({
    title:"Deliverables Due This Month", subtitle:`Due in ${today.toLocaleDateString("en-US",{month:"long",year:"numeric"})} — not yet complete`, unit:"deliverables",
    rows: delsDueMonthList.map(d => ({ primary:d.title, badge:delHealth(d), right:d.end?.slice(5), secondary:[d.proj?.client||"—", d.proj?.name, `${d.subtasks?.length||0} tasks`] })),
  });

  const openAtRisk = () => {
    const projRows = atRiskProjList.map(p => {
      const activeDels   = p.deliverables.filter(d => d.status !== "Done");
      const offTrackDels = activeDels.filter(d => delHealth(d) === "off-track");
      const atRiskDels   = activeDels.filter(d => delHealth(d) === "at-risk");
      const projHealth   = projectHealth(p);
      return { p, activeDels, offTrackDels, atRiskDels, projHealth };
    });
    setDrawer({
      title: "At-Risk & Watch Projects",
      subtitle: "Projects with one or more deliverables off track, at risk, or blocked",
      unit: "projects",
      renderRows: (rows) => rows.map(({ p, activeDels, offTrackDels, atRiskDels, projHealth }, i) => (
        <AtRiskProjRow key={i} p={p} activeDels={activeDels}
          offTrackDels={offTrackDels} atRiskDels={atRiskDels}
          projHealth={projHealth} />
      )),
      rows: projRows,
    });
  };

  const openOverloaded = () => setDrawer({
    title:"Overloaded Team Members", subtitle:"People with >100% utilization over the next 4 weeks", unit:"people",
    renderRows: (rows) => rows.map((r,i) => (
      <div key={i} style={{ padding:"12px 0", borderBottom:"1px solid rgba(0,0,0,0.05)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:r.person.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:"#fff" }}>{r.person.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#1f2937" }}>{r.person.name}</div>
            <div style={{ fontSize:10, color:"#6b7280" }}>{r.planned}h planned / {r.avail}h available</div>
          </div>
          <span style={{ fontSize:14, fontWeight:900, color:utilColor(r.utilPct) }}>{r.utilPct}%</span>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
          {r.weekBreakdown.filter(w=>w.planned>0).map(w => (
            <div key={w.ws} style={{ display:"flex", alignItems:"center", gap:8, fontSize:10 }}>
              <span style={{ color:"#9ca3af", width:60 }}>W/O {w.ws.slice(5)}</span>
              <div style={{ flex:1, height:6, background:"rgba(0,0,0,0.06)", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min(150,w.avail>0?Math.round(w.planned/w.avail*100):100)}%`, background:utilColor(w.avail>0?Math.round(w.planned/w.avail*100):100), borderRadius:3 }} />
              </div>
              <span style={{ color:"#374151", width:30, textAlign:"right" }}>{w.planned}h</span>
            </div>
          ))}
        </div>
        {r.topProjs.length>0 && <div style={{ fontSize:9, color:"#9ca3af", marginTop:5 }}>Top projects: {r.topProjs.join(", ")}</div>}
      </div>
    )),
    rows: overloaded,
  });

  const openHealthSegment = (h) => {
    const dels = allDels.filter(d => d.status!=="Done" && delHealth(d)===h);
    setDrawer({
      title: healthMeta[h]?.label+" Deliverables", subtitle:`All active deliverables currently classified as ${healthMeta[h]?.label}`, unit:"deliverables",
      rows: dels.sort((a,b)=>a.proj?.client?.localeCompare(b.proj?.client||"")||0).map(d => ({
        primary:d.title, badge:h, right:d.end?.slice(5)||"—",
        secondary:[d.proj?.client||"—", d.proj?.name, d.status],
      })),
    });
  };

  const openForecast = (bucket) => setDrawer({
    title:`Deliverables: ${bucket.label}`, subtitle:`Upcoming deliverables due before ${bucket.end}`, unit:"deliverables",
    rows: bucket.dels.sort((a,b)=>a.end?.localeCompare(b.end||"")||0).map(d => ({
      primary:d.title, badge:delHealth(d), right:d.end?.slice(5),
      secondary:[d.proj?.client||"—", d.proj?.name, d.status],
    })),
  });

  const openAccomplishments = (type) => {
    const map = {
      tasks:       { list:doneTasksLast30,  unit:"tasks",        title:"Tasks Completed",         sub:"Completed in the last 30 days" },
      deliverables:{ list:doneDelsLast30,   unit:"deliverables", title:"Deliverables Completed",  sub:"Completed in the last 30 days" },
      projects:    { list:doneProjsLast30,  unit:"projects",     title:"Projects Completed",      sub:"All deliverables done in last 30 days" },
    };
    const { list, unit, title, sub } = map[type];
    setDrawer({
      title, subtitle:sub, unit,
      rows: list.map(item => ({
        primary: item.name||item.title, right:item.end?.slice(5)||"—",
        secondary:[item.proj?.client||item.client||"—", item.proj?.name||"", item.status||"Done"],
      })),
    });
  };

  // ── KPI + sub-components ─────────────────────────────────────────────────
  const KPI = ({ value, label, sub, color, onClick }) => (
    <div onClick={onClick} style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.07)", borderRadius:10, padding:"18px 20px", cursor:onClick?"pointer":"default", flex:1, minWidth:120, transition:"box-shadow 0.12s" }}
      onMouseEnter={e=>onClick&&(e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.1)")}
      onMouseLeave={e=>(e.currentTarget.style.boxShadow="none")}>
      <div style={{ fontSize:32, fontWeight:900, color:color||"#1f2937", lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, fontWeight:700, color:"#374151", marginTop:6 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:"#9ca3af", marginTop:3 }}>{sub}</div>}
      {onClick && <div style={{ fontSize:9, color:BRAND_TEAL, marginTop:4, fontWeight:600 }}>↗ Click to drill down</div>}
    </div>
  );
  const SectionTitle = ({ children }) => <div style={{ fontSize:13, fontWeight:800, color:"#1f2937", marginBottom:14, letterSpacing:"-0.01em" }}>{children}</div>;
  const Card = ({ children, style={} }) => <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.07)", borderRadius:10, padding:"18px 20px", ...style }}>{children}</div>;
  const Donut = ({ data }) => {
    const total = data.reduce((s,d)=>s+d.value,0)||1;
    let pct=0;
    const stops = data.filter(d=>d.value>0).flatMap(d => {
      const s=pct, e=pct+(d.value/total)*100; pct=e;
      return [`${d.color} ${s.toFixed(1)}%`,`${d.color} ${e.toFixed(1)}%`];
    });
    const gradient = stops.length ? `conic-gradient(${stops.join(", ")})` : "conic-gradient(rgba(0,0,0,0.06) 0%,rgba(0,0,0,0.06) 100%)";
    return (
      <div style={{ position:"relative", width:110, height:110, flexShrink:0 }}>
        <div style={{ width:110, height:110, borderRadius:"50%", background:gradient }} />
        <div style={{ position:"absolute", top:15, left:15, width:80, height:80, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:18, fontWeight:900, color:"#1f2937" }}>{healthyPct}%</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <ReportingDrawer drawer={drawer} setDrawer={setDrawer} />

      {/* ── Export Center ── */}
      <ReportExportCenter
        projects={projects}
        people={people}
        pto={pto}
        adminTasks={adminTasks}
        holidays={holidays}
      />

      {/* ── Header ── */}
      <div>
        <div style={{ fontSize:18, fontWeight:900, color:"#1f2937" }}>Reporting Dashboard</div>
        <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>Executive overview · {today.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <KPI value={activeClients}       label="Active Clients"             color={BRAND_TEAL} />
        <KPI value={activeProjects.length} label="Active Projects"          color="#1f2937" />
        <KPI value={delsDueMonthList.length} label="Deliverables Due This Month" color="#6366f1" onClick={openDelsDueMonth} />
        <KPI value={`${avgUtil}%`}       label="Team Capacity Utilization"  color={utilColor(avgUtil)} sub="Next 4 weeks avg" onClick={()=>setDrawer({title:"Team Capacity Detail",subtitle:"Utilization breakdown for all team members — next 4 weeks",unit:"people",renderRows:(rows)=>rows.map((r,i)=>(<div key={i} style={{padding:"10px 0",borderBottom:"1px solid rgba(0,0,0,0.05)",display:"flex",alignItems:"center",gap:10}}><div style={{width:26,height:26,borderRadius:"50%",background:r.person.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"#fff"}}>{r.person.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div><div style={{flex:1}}><div style={{fontSize:11,fontWeight:700,color:"#1f2937"}}>{r.person.name}</div><div style={{fontSize:10,color:"#6b7280"}}>{r.planned}h / {r.avail}h</div></div><span style={{fontSize:13,fontWeight:900,color:utilColor(r.utilPct)}}>{r.utilPct}%</span></div>)),rows:personUtilization})} />
        <KPI value={overloaded.length}   label="Overloaded Team Members"   color={overloaded.length>0?"#ef4444":"#34d399"} sub={overloaded.length>0?"Over 100% capacity":"All within capacity"} onClick={overloaded.length>0?openOverloaded:undefined} />
        <KPI value={atRiskProjList.length} label="Projects Needing Attention" color={atRiskProjList.length>0?"#f97316":"#34d399"} sub="Watch or Needs Attention" onClick={atRiskProjList.length>0?openAtRisk:undefined} />
      </div>

      {/* ── Portfolio Health ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Card>
          <SectionTitle>Deliverable Health Overview</SectionTitle>
          <div style={{ fontSize:10, color:"#9ca3af", marginBottom:10 }}>Health is tracked at the deliverable level. A project isn't Off Track unless multiple deliverables are.</div>
          <div style={{ display:"flex", gap:16, alignItems:"center" }}>
            <Donut data={[
              { label:"On Track", value:delHealthCounts["on-track"], color:"#34d399" },
              { label:"At Risk",  value:delHealthCounts["at-risk"],  color:"#fbbf24" },
              { label:"Off Track",value:delHealthCounts["off-track"],color:"#ef4444" },
            ]} />
            <div style={{ flex:1 }}>
              {[["on-track","On Track","#34d399"],["at-risk","At Risk","#fbbf24"],["off-track","Off Track","#ef4444"]].map(([k,l,c])=>(
                <div key={k} onClick={()=>openHealthSegment(k)} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, cursor:"pointer", borderRadius:6, padding:"4px 6px" }}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.03)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ width:10, height:10, borderRadius:2, background:c, flexShrink:0 }} />
                  <span style={{ fontSize:11, color:"#374151", flex:1 }}>{l}</span>
                  <span style={{ fontSize:14, fontWeight:800, color:c }}>{delHealthCounts[k]}</span>
                  <span style={{ fontSize:9, color:BRAND_TEAL }}>↗</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>Project Health Rollup</SectionTitle>
          <div style={{ fontSize:10, color:"#9ca3af", marginBottom:10 }}>Healthy = all deliverables on track · Watch = 1 at risk · Needs Attention = 2+ off track or &gt;25% at risk</div>
          {[
            ["healthy","Healthy",projHealthCounts.healthy],
            ["watch","Watch",projHealthCounts.watch],
            ["needs-attention","Needs Attention",projHealthCounts["needs-attention"]],
          ].map(([k,l,v])=>{
            const m=healthMeta[k];
            return (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
                <span style={{ fontSize:11, color:"#6b7280" }}>{l}</span>
                <span style={{ fontSize:14, fontWeight:800, color:m.color }}>{v}</span>
              </div>
            );
          })}
          <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(0,0,0,0.04)" }}>
            <span style={{ fontSize:11, color:"#6b7280" }}>Total Active Deliverables</span>
            <span style={{ fontSize:14, fontWeight:800, color:"#1f2937" }}>{totalActiveDels}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0" }}>
            <span style={{ fontSize:11, color:"#6b7280" }}>% Healthy</span>
            <span style={{ fontSize:14, fontWeight:800, color:"#34d399" }}>{healthyPct}%</span>
          </div>
        </Card>
      </div>

      {/* ── Team Capacity ── */}
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
          <SectionTitle>Team Capacity — Next 4 Weeks</SectionTitle>
          <div style={{ background:overloaded.length>0?"rgba(239,68,68,0.08)":"rgba(52,211,153,0.08)", border:`1px solid ${overloaded.length>0?"rgba(239,68,68,0.2)":"rgba(52,211,153,0.2)"}`, borderRadius:8, padding:"8px 14px", textAlign:"right" }}>
            <div style={{ fontSize:10, color:"#6b7280", fontWeight:700, marginBottom:2 }}>STAFFING RISK</div>
            <div style={{ fontSize:11, color:"#374151" }}>{overloaded.length} overloaded · {maxUtil}% peak</div>
          </div>
        </div>
        {personUtilization.map(({person,planned,avail,utilPct}) => (
          <div key={person.id} onClick={()=>setDrawer({title:`${person.name} — Capacity Detail`,subtitle:"Weekly breakdown · next 4 weeks",unit:"weeks",renderRows:(rows)=>rows.map((r,i)=>(<div key={i} style={{padding:"8px 0",borderBottom:"1px solid rgba(0,0,0,0.04)",display:"flex",alignItems:"center",gap:10}}><span style={{color:"#9ca3af",width:70,fontSize:10}}>W/O {r.ws.slice(5)}</span><div style={{flex:1,height:8,background:"rgba(0,0,0,0.06)",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(150,r.avail>0?Math.round(r.planned/r.avail*100):100)}%`,background:utilColor(r.avail>0?Math.round(r.planned/r.avail*100):100),borderRadius:4}} /></div><span style={{fontSize:10,fontWeight:700,color:utilColor(r.avail>0?Math.round(r.planned/r.avail*100):100),width:36,textAlign:"right"}}>{r.avail>0?Math.round(r.planned/r.avail*100):0}%</span><span style={{fontSize:9,color:"#9ca3af",width:60,textAlign:"right"}}>{r.planned}h/{r.avail}h</span></div>)),rows:personUtilization.find(p=>p.person.id===person.id)?.weekBreakdown||[]})}
            style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, cursor:"pointer", borderRadius:8, padding:"4px 6px" }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.02)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:person.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:"#fff", flexShrink:0 }}>{person.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
            <div style={{ width:100, flexShrink:0, fontSize:11, fontWeight:600, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{person.name}</div>
            <div style={{ flex:1, height:8, background:"rgba(0,0,0,0.06)", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${Math.min(150,utilPct)}%`, background:utilColor(utilPct), borderRadius:4 }} />
            </div>
            <div style={{ width:42, textAlign:"right", fontSize:11, fontWeight:800, color:utilColor(utilPct), flexShrink:0 }}>{utilPct}%</div>
            <div style={{ width:80, fontSize:9, color:"#9ca3af", flexShrink:0, textAlign:"right" }}>{planned}h / {avail}h</div>
            <span style={{ fontSize:9, color:BRAND_TEAL }}>↗</span>
          </div>
        ))}
        <div style={{ display:"flex", gap:16, marginTop:12, paddingTop:10, borderTop:"1px solid rgba(0,0,0,0.06)" }}>
          {[["#34d399","<80%"],["#fbbf24","80–100%"],["#f97316","100–120%"],["#ef4444",">120%"]].map(([c,l])=>(
            <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:2, background:c }} />
              <span style={{ fontSize:9, color:"#6b7280" }}>{l}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Delivery Forecast ── */}
      <Card>
        <SectionTitle>Delivery Forecast</SectionTitle>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {forecastBuckets.map(b => (
            <div key={b.label} onClick={()=>openForecast(b)} style={{ flex:1, minWidth:140, cursor:"pointer", borderRadius:8, padding:8 }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.02)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ fontSize:11, fontWeight:700, color:"#374151", marginBottom:8 }}>{b.label} <span style={{ fontSize:9, color:BRAND_TEAL }}>↗</span></div>
              {[{l:"Total",v:b.total,c:BRAND_TEAL},{l:"At Risk",v:b.atRisk,c:"#fbbf24"},{l:"Blocked",v:b.blocked,c:"#ef4444"}].map(r=>(
                <div key={r.l} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <div style={{ flex:1, height:10, background:"rgba(0,0,0,0.04)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.round((r.v/Math.max(1,b.total))*100)}%`, background:r.c, borderRadius:3 }} />
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, color:r.c, width:24, textAlign:"right" }}>{r.v}</span>
                  <span style={{ fontSize:9, color:"#9ca3af", width:44 }}>{r.l}</span>
                </div>
              ))}
              <div style={{ fontSize:28, fontWeight:900, color:BRAND_TEAL, marginTop:4 }}>{b.total}</div>
              <div style={{ fontSize:9, color:"#9ca3af" }}>deliverables</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Client Portfolio ── */}
      <Card>
        <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
          <div style={{ flex:1, minWidth:0 }}>
            <SectionTitle>Client Portfolio</SectionTitle>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ borderBottom:"2px solid rgba(0,0,0,0.08)" }}>
                    {[["client","Client"],["projects","Projects"],["deliverables","Deliverables"],["tasks","Tasks"],["health","Health"],["cap","Est. Hours"]].map(([k,l])=>(
                      <th key={k} onClick={()=>{setSortClientDir(sortClientCol===k&&sortClientDir==="asc"?"desc":"asc");setSortClientCol(k);}}
                        style={{ textAlign:"left", padding:"6px 10px", fontSize:9, fontWeight:700, color:"#6b7280", cursor:"pointer", whiteSpace:"nowrap", userSelect:"none" }}>
                        {l} {sortClientCol===k?(sortClientDir==="asc"?"↑":"↓"):""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientRows.map(row => {
                    const hm=healthMeta[row.health]||healthMeta["healthy"];
                    return (
                      <tr key={row.client} onClick={()=>setDrillClient(drillClient?.client===row.client?null:row)}
                        style={{ borderBottom:"1px solid rgba(0,0,0,0.04)", cursor:"pointer", background:drillClient?.client===row.client?`${BRAND_TEAL}08`:"transparent" }}
                        onMouseEnter={e=>e.currentTarget.style.background=`${BRAND_TEAL}08`}
                        onMouseLeave={e=>e.currentTarget.style.background=drillClient?.client===row.client?`${BRAND_TEAL}08`:"transparent"}>
                        <td style={{ padding:"8px 10px", fontWeight:700, color:"#1f2937" }}>{row.client}</td>
                        <td style={{ padding:"8px 10px", color:"#374151" }}>{row.projects.length}</td>
                        <td style={{ padding:"8px 10px", color:"#374151" }}>{row.delCount}</td>
                        <td style={{ padding:"8px 10px", color:"#374151" }}>{row.taskCount}</td>
                        <td style={{ padding:"8px 10px" }}><span style={{ background:hm.bg, color:hm.color, borderRadius:4, padding:"2px 8px", fontSize:10, fontWeight:700 }}>{hm.label}</span></td>
                        <td style={{ padding:"8px 10px", color:"#374151" }}>{row.capHrs}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          {drillClient && (() => {
            const upcoming = drillClient.projects.flatMap(p=>p.deliverables.filter(d=>d.end&&d.end>=todayStr&&d.end<=in30&&d.status!=="Done").map(d=>({...d,proj:p}))).sort((a,b)=>a.end?.localeCompare(b.end||"")||0);
            const assigneeIds = [...new Set(drillClient.projects.flatMap(p=>p.deliverables.flatMap(d=>d.subtasks.flatMap(s=>s.assignees||[]).concat(d.assignees||[]))))];
            return (
              <div style={{ width:240, flexShrink:0, background:"rgba(0,0,0,0.02)", border:"1px solid rgba(0,0,0,0.08)", borderRadius:8, padding:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:"#1f2937" }}>{drillClient.client}</div>
                  <button onClick={()=>setDrillClient(null)} style={{ background:"none", border:"none", color:"#9ca3af", cursor:"pointer", fontSize:16 }}>×</button>
                </div>
                <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", marginBottom:6, letterSpacing:"0.07em" }}>PROJECTS</div>
                {drillClient.projects.map(p=>(
                  <div key={p.id} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:p.color, flexShrink:0 }} />
                    <span style={{ fontSize:11, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{p.name}</span>
                    <Hbadge h={projectHealth(p)} />
                  </div>
                ))}
                {upcoming.length>0 && <>
                  <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", margin:"10px 0 6px", letterSpacing:"0.07em" }}>DUE NEXT 30 DAYS</div>
                  {upcoming.slice(0,5).map(d=>(
                    <div key={d.id} style={{ fontSize:10, color:"#374151", padding:"3px 0", borderBottom:"1px solid rgba(0,0,0,0.04)", display:"flex", justifyContent:"space-between" }}>
                      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{d.title}</span>
                      <span style={{ color:"#9ca3af", marginLeft:6, flexShrink:0 }}>{d.end?.slice(5)}</span>
                    </div>
                  ))}
                </>}
                {assigneeIds.length>0 && <>
                  <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", margin:"10px 0 6px", letterSpacing:"0.07em" }}>TEAM</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {assigneeIds.slice(0,8).map(id=>{ const p=people.find(x=>x.id===id); if(!p) return null; return <div key={id} title={p.name} style={{ width:24, height:24, borderRadius:"50%", background:p.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:800, color:"#fff" }}>{p.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>; })}
                  </div>
                </>}
              </div>
            );
          })()}
        </div>
      </Card>

      {/* ── Accomplishments ── */}
      <Card>
        <SectionTitle>Team Accomplishments — Last 30 Days</SectionTitle>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {[
            { value:doneTasksLast30.length,  label:"Tasks Completed",         color:BRAND_TEAL,  type:"tasks"        },
            { value:doneDelsLast30.length,   label:"Deliverables Completed",  color:"#6366f1",   type:"deliverables" },
            { value:doneProjsLast30.length,  label:"Projects Completed",      color:"#34d399",   type:"projects"     },
            { value:`${effortDelivered}h`,   label:"Est. Effort Delivered",   color:"#f59e0b",   type:null            },
          ].map(k=>(
            <div key={k.label} onClick={k.type?()=>openAccomplishments(k.type):undefined}
              style={{ flex:1, minWidth:100, background:`${k.color}0d`, border:`1px solid ${k.color}25`, borderRadius:8, padding:"14px 16px", cursor:k.type?"pointer":"default" }}
              onMouseEnter={e=>k.type&&(e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.08)")}
              onMouseLeave={e=>(e.currentTarget.style.boxShadow="none")}>
              <div style={{ fontSize:28, fontWeight:900, color:k.color, lineHeight:1 }}>{k.value}</div>
              <div style={{ fontSize:10, fontWeight:700, color:"#374151", marginTop:5 }}>{k.label}</div>
              {k.type && <div style={{ fontSize:9, color:k.color, marginTop:4, fontWeight:600 }}>↗ View list</div>}
            </div>
          ))}
        </div>
      </Card>


      {/* ── Client Hour Forecasting ── */}
      {(() => {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd   = new Date(today.getFullYear(), 11, 31);
        const yearStartStr = yearStart.toISOString().slice(0,10);
        const yearEndStr   = yearEnd.toISOString().slice(0,10);
        const daysInYear   = Math.ceil((yearEnd - yearStart) / 86400000) + 1;
        const dayOfYear    = Math.ceil((today - yearStart) / 86400000) + 1;
        const pctYearElapsed = dayOfYear / daysInYear;

        // Client tasks = project tasks + admin-assigned tasks
        const projectClientTasks = projects.flatMap(p =>
          p.deliverables.flatMap(d => {
            const tasks = d.subtasks.length > 0 ? d.subtasks : [d];
            return tasks.map(t => ({
              ...t,
              proj: p,
              hrs: effortHrs(t.effort, t.customHours),
              assignees: t.assignees || [],
            }));
          })
        );
        // Admin-assigned tasks count as a single-person assignment
        const adminClientTasks = adminTasks.map(t => ({
          ...t,
          assignees: [t.assignedTo],
          hrs: effortHrs(t.effort, t.customHours),
          end: t.dueDate || todayStr,
          isAdminTask: true,
        }));
        const clientTasks = [...projectClientTasks, ...adminClientTasks];

        const forecasts = people.map(person => {
          const myTasks = clientTasks.filter(t =>
            (t.assignees || []).includes(person.id)
          );
          const target = person.annualTarget || 1850;

          // YTD completed: tasks marked Done with end date this year
          const ytdDone = myTasks
            .filter(t => t.status === "Done" && t.end >= yearStartStr && t.end <= todayStr)
            .reduce((s, t) => s + t.hrs, 0);

          // Planned future: not Done, end date from today through year end
          const plannedFuture = myTasks
            .filter(t => t.status !== "Done" && t.end > todayStr && t.end <= yearEndStr)
            .reduce((s, t) => s + t.hrs, 0);

          // In-progress partial: count at 50%
          const inProgressPartial = myTasks
            .filter(t => t.status === "In Progress" && t.end <= todayStr)
            .reduce((s, t) => s + t.hrs * 0.5, 0);

          const completedHrs = Math.round(ytdDone + inProgressPartial);
          const forecastedHrs = Math.round(completedHrs + plannedFuture);
          const pctOfTarget = target > 0 ? Math.round((forecastedHrs / target) * 100) : 0;

          // Neutral pace label — not surveillance language
          let paceLabel, paceColor;
          if (forecastedHrs === 0 && completedHrs === 0) {
            paceLabel = "No Tasks Planned"; paceColor = "#9ca3af";
          } else if (pctOfTarget >= 95 && pctOfTarget <= 110) {
            paceLabel = "On Pace";         paceColor = "#34d399";
          } else if (pctOfTarget > 110) {
            paceLabel = "Above Forecast";  paceColor = "#6366f1";
          } else if (pctOfTarget >= 75) {
            paceLabel = "Below Forecast";  paceColor = "#fbbf24";
          } else {
            paceLabel = "Capacity Not Planned"; paceColor = "#f97316";
          }

          return { person, target, completedHrs, plannedFuture: Math.round(plannedFuture), forecastedHrs, pctOfTarget, paceLabel, paceColor, myTasks: myTasks.length };
        });

        const totalForecasted = forecasts.reduce((s, f) => s + f.forecastedHrs, 0);
        const totalTarget     = forecasts.reduce((s, f) => s + f.target, 0);
        const portfolioPct    = totalTarget > 0 ? Math.round((totalForecasted / totalTarget) * 100) : 0;

        return (
          <Card style={{ gridColumn: "1 / -1" }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:10 }}>
              <div>
                <SectionTitle>Client Hour Forecasting</SectionTitle>
                <div style={{ fontSize:10, color:"#9ca3af", marginTop:2 }}>
                  Based on planned task estimates, not actual time entry. · {today.getFullYear()} · {Math.round(pctYearElapsed*100)}% of year elapsed
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:11, color:"#6b7280", fontWeight:600 }}>Portfolio Forecast</div>
                  <div style={{ fontSize:20, fontWeight:900, color: portfolioPct >= 90 ? "#34d399" : portfolioPct >= 70 ? "#fbbf24" : "#f97316" }}>
                    {totalForecasted.toLocaleString()}h
                  </div>
                  <div style={{ fontSize:10, color:"#9ca3af" }}>vs {totalTarget.toLocaleString()}h target · {portfolioPct}%</div>
                </div>
              </div>
            </div>

            {/* Progress bar for portfolio */}
            <div style={{ height:6, background:"rgba(0,0,0,0.06)", borderRadius:3, overflow:"hidden", marginBottom:18 }}>
              <div style={{ height:"100%", width:`${Math.min(100,portfolioPct)}%`, background: portfolioPct>=90?"#34d399":portfolioPct>=70?"#fbbf24":"#f97316", borderRadius:3, transition:"width 0.4s" }} />
            </div>

            {/* Per-person rows */}
            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
              {/* Header */}
              <div style={{ display:"grid", gridTemplateColumns:"160px 1fr 70px 70px 80px 80px 110px", gap:0, padding:"0 0 8px 0", borderBottom:"1px solid rgba(0,0,0,0.07)", marginBottom:4 }}>
                {["Person","Forecast Progress","Done","Planned","Forecast","Target","Status"].map((h,i) => (
                  <div key={i} style={{ fontSize:9, fontWeight:700, color:"#9ca3af", letterSpacing:"0.07em", textTransform:"uppercase", padding:"0 8px" }}>{h}</div>
                ))}
              </div>

              {forecasts.map(({ person, target, completedHrs, plannedFuture, forecastedHrs, pctOfTarget, paceLabel, paceColor }) => {
                const barCompleted = target > 0 ? Math.min(100, Math.round((completedHrs / target) * 100)) : 0;
                const barPlanned   = target > 0 ? Math.min(100 - barCompleted, Math.round((plannedFuture / target) * 100)) : 0;
                return (
                  <div key={person.id} style={{ display:"grid", gridTemplateColumns:"160px 1fr 70px 70px 80px 80px 110px", gap:0, padding:"10px 0", borderBottom:"1px solid rgba(0,0,0,0.04)", alignItems:"center" }}>
                    {/* Person */}
                    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"0 8px" }}>
                      <div style={{ width:24, height:24, borderRadius:"50%", background:person.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:800, color:"#fff", flexShrink:0 }}>
                        {person.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                      </div>
                      <span style={{ fontSize:11, fontWeight:600, color:"#1f2937", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{person.name}</span>
                    </div>

                    {/* Stacked progress bar */}
                    <div style={{ padding:"0 8px" }}>
                      <div style={{ height:8, background:"rgba(0,0,0,0.06)", borderRadius:4, overflow:"hidden", display:"flex" }}>
                        <div style={{ height:"100%", width:`${barCompleted}%`, background:"#34d399", borderRadius:"4px 0 0 4px", flexShrink:0 }} />
                        <div style={{ height:"100%", width:`${barPlanned}%`, background:"rgba(99,102,241,0.35)", flexShrink:0 }} />
                      </div>
                      <div style={{ fontSize:9, color:"#9ca3af", marginTop:3 }}>
                        <span style={{ color:"#059669" }}>■</span> Done &nbsp;
                        <span style={{ color:"#6366f1" }}>■</span> Planned
                      </div>
                    </div>

                    {/* Numbers */}
                    <div style={{ padding:"0 8px", fontSize:11, fontWeight:700, color:"#059669", textAlign:"right" }}>{completedHrs}h</div>
                    <div style={{ padding:"0 8px", fontSize:11, fontWeight:600, color:"#6366f1", textAlign:"right" }}>{plannedFuture}h</div>
                    <div style={{ padding:"0 8px", fontSize:12, fontWeight:800, color:"#1f2937", textAlign:"right" }}>{forecastedHrs}h</div>
                    <div style={{ padding:"0 8px", fontSize:11, color:"#9ca3af", textAlign:"right" }}>{target.toLocaleString()}h</div>

                    {/* Status badge */}
                    <div style={{ padding:"0 8px" }}>
                      <span style={{ fontSize:9, fontWeight:700, color:paceColor, background:`${paceColor}18`, borderRadius:4, padding:"3px 7px", whiteSpace:"nowrap" }}>
                        {paceLabel}
                      </span>
                      <div style={{ fontSize:9, color:"#9ca3af", marginTop:2 }}>{pctOfTarget}% of target</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Disclaimer */}
            <div style={{ marginTop:16, padding:"10px 14px", background:"rgba(0,0,0,0.02)", borderRadius:6, borderLeft:"3px solid rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize:10, color:"#9ca3af", lineHeight:1.6 }}>
                <b style={{ color:"#6b7280" }}>About this view:</b> Hours are estimated from task size (S=1h, M=4h, L=8h, Custom=entered value). Completed hours reflect tasks marked Done or In Progress this year. Forecasted hours add planned future tasks through year-end. This is a planning tool — adjust annual targets per person in ⚙ Team Settings.
              </div>
            </div>
          </Card>
        );
      })()}


      {/* TIME ALLOCATION REPORT — by person → project number / client */}

      {(() => {
        const EFFORT_HRS = { S:1, M:4, L:8 };
        const hrs = t => Number(t.customHours) || EFFORT_HRS[t.effort] || 4;

        // ── Accumulate: person → project ─────────────────────────────────────
        const accMap = {};
        activeProjects.forEach(proj => {
          proj.deliverables.forEach(del => {
            const items = del.subtasks.length > 0 ? del.subtasks : [del];
            items.forEach(task => {
              (task.assignees || []).forEach(pid => {
                const key = `${pid}::${proj.id}`;
                if (!accMap[key]) accMap[key] = {
                  personId: pid,
                  projectId: proj.id, projectName: proj.name,
                  projectNumber: proj.projectNumber || "",
                  client: proj.client || "No Client",
                  color: proj.color,
                  totalHrs: 0, completedHrs: 0, pendingHrs: 0, taskCount: 0,
                };
                const h = hrs(task);
                accMap[key].totalHrs  += h;
                accMap[key].taskCount += 1;
                if (task.status === "Done") accMap[key].completedHrs += h;
                else                        accMap[key].pendingHrs   += h;
              });
            });
          });
        });

        // ── Enrich rows with person name/color ───────────────────────────────
        const allRows = Object.values(accMap).map(r => ({
          ...r,
          personName:  people.find(p => p.id === r.personId)?.name  || r.personId,
          personColor: people.find(p => p.id === r.personId)?.color || "#9ca3af",
        }));

        // ── Build nested: person → projects (sorted by project number, then name)
        const personOrder = people.filter(p => allRows.some(r => r.personId === p.id));
        const structure = personOrder.map(person => {
          const pRows = allRows
            .filter(r => r.personId === person.id)
            .sort((a, b) => {
              // Sort by project number if available, otherwise by client then name
              if (a.projectNumber && b.projectNumber)
                return a.projectNumber.localeCompare(b.projectNumber, undefined, { numeric: true });
              if (a.projectNumber) return -1;
              if (b.projectNumber) return 1;
              const cc = a.client.localeCompare(b.client);
              return cc !== 0 ? cc : a.projectName.localeCompare(b.projectName);
            });
          return {
            personId:    person.id,
            personName:  person.name,
            personColor: person.color,
            projects:    pRows,
            totalHrs:    pRows.reduce((s,r) => s+r.totalHrs,    0),
            completedHrs:pRows.reduce((s,r) => s+r.completedHrs, 0),
            pendingHrs:  pRows.reduce((s,r) => s+r.pendingHrs,   0),
            taskCount:   pRows.reduce((s,r) => s+r.taskCount,    0),
          };
        });

        const grand = structure.reduce(
          (s,p) => ({ total:s.total+p.totalHrs, done:s.done+p.completedHrs, pending:s.pending+p.pendingHrs }),
          { total:0, done:0, pending:0 }
        );

        // ── CSV ───────────────────────────────────────────────────────────────
        const downloadCSV = () => {
          const esc = v => `"${String(v||"").replace(/"/g,'""')}"`;
          const rows = [["Person","Project Number","Client","Project","Total Allocated (h)","Completed (h)","Pending (h)","Task Count"]];
          structure.forEach(person => {
            person.projects.forEach(r => {
              rows.push([person.personName, r.projectNumber, r.client, r.projectName, r.totalHrs, r.completedHrs, r.pendingHrs, r.taskCount]);
            });
            rows.push([`${person.personName} TOTAL`, "", "", "", person.totalHrs, person.completedHrs, person.pendingHrs, person.taskCount]);
            rows.push([]);
          });
          rows.push(["GRAND TOTAL","","","", grand.total, grand.done, grand.pending]);
          const csv = rows.map(r => r.map(esc).join(",")).join("\n");
          const a = document.createElement("a");
          a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
          a.download = `time-allocation-${new Date().toISOString().slice(0,10)}.csv`;
          a.click();
        };

        // ── Excel (3 tabs: Detail | By Person | By Client) ────────────────────
        const downloadExcel = async () => {
          let XLSX = window.XLSX;
          if (!XLSX) {
            await new Promise((res, rej) => {
              const s = document.createElement("script");
              s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
              s.onload = res; s.onerror = rej;
              document.head.appendChild(s);
            });
            XLSX = window.XLSX;
          }
          const wb = XLSX.utils.book_new();

          // Detail — one row per person × project
          const detailRows = [];
          structure.forEach(person => {
            person.projects.forEach(r => {
              detailRows.push({
                "Person":              person.personName,
                "Project Number":      r.projectNumber || "",
                "Client":              r.client,
                "Project":             r.projectName,
                "Total Allocated (h)": r.totalHrs,
                "Completed (h)":       r.completedHrs,
                "Pending (h)":         r.pendingHrs,
                "Task Count":          r.taskCount,
                "% Complete":          r.totalHrs > 0 ? Math.round((r.completedHrs/r.totalHrs)*100)+"%" : "0%",
              });
            });
          });
          const ws1 = XLSX.utils.json_to_sheet(detailRows);
          ws1["!cols"] = [20,14,20,32,18,14,14,10,12].map(w => ({ wch: w }));
          XLSX.utils.book_append_sheet(wb, ws1, "Detail");

          // By Person summary
          const personRows = [];
          structure.forEach(person => {
            personRows.push({
              "Person":              person.personName,
              "Projects":            person.projects.length,
              "Total Allocated (h)": person.totalHrs,
              "Completed (h)":       person.completedHrs,
              "Pending (h)":         person.pendingHrs,
              "Task Count":          person.taskCount,
              "% Complete":          person.totalHrs > 0 ? Math.round((person.completedHrs/person.totalHrs)*100)+"%" : "0%",
            });
          });
          personRows.push({ "Person":"GRAND TOTAL", "Projects":structure.reduce((s,p)=>s+p.projects.length,0), "Total Allocated (h)":grand.total, "Completed (h)":grand.done, "Pending (h)":grand.pending });
          const ws2 = XLSX.utils.json_to_sheet(personRows);
          ws2["!cols"] = [22,10,18,14,14,10,12].map(w => ({ wch: w }));
          XLSX.utils.book_append_sheet(wb, ws2, "By Person");

          // By Client summary
          const clientMap = {};
          allRows.forEach(r => {
            if (!clientMap[r.client]) clientMap[r.client] = { total:0, done:0, pending:0, projects: new Set() };
            clientMap[r.client].total   += r.totalHrs;
            clientMap[r.client].done    += r.completedHrs;
            clientMap[r.client].pending += r.pendingHrs;
            clientMap[r.client].projects.add(r.projectId);
          });
          const clientRows = Object.entries(clientMap)
            .sort(([a],[b]) => a.localeCompare(b))
            .map(([client, d]) => ({
              "Client":              client,
              "Projects":            d.projects.size,
              "Total Allocated (h)": d.total,
              "Completed (h)":       d.done,
              "Pending (h)":         d.pending,
              "% Complete":          d.total > 0 ? Math.round((d.done/d.total)*100)+"%" : "0%",
            }));
          clientRows.push({ "Client":"GRAND TOTAL", "Projects":allRows.reduce((s,r,i,arr)=>s+(i===0||arr[i-1].client!==r.client?1:0),0), "Total Allocated (h)":grand.total, "Completed (h)":grand.done, "Pending (h)":grand.pending });
          const ws3 = XLSX.utils.json_to_sheet(clientRows);
          ws3["!cols"] = [28,10,18,14,14,12].map(w => ({ wch: w }));
          XLSX.utils.book_append_sheet(wb, ws3, "By Client");

          XLSX.writeFile(wb, `time-allocation-${new Date().toISOString().slice(0,10)}.xlsx`);
        };

        // ── UI ────────────────────────────────────────────────────────────────
        const colH = (extra={}) => ({ fontSize:10, fontWeight:700, color:"#9ca3af", letterSpacing:"0.06em",
          textTransform:"uppercase", padding:"7px 12px", borderBottom:"2px solid rgba(0,0,0,0.07)",
          background:"#f8fafc", textAlign:"left", position:"sticky", top:0, ...extra });
        const cell = (extra={}) => ({ fontSize:12, padding:"7px 12px",
          borderBottom:"1px solid rgba(0,0,0,0.04)", verticalAlign:"middle", ...extra });

        return (
          <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:10, overflow:"hidden", marginTop:8 }}>

            {/* Header bar */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px",
              borderBottom:"1px solid rgba(0,0,0,0.07)", background:"#f8fafc", flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:"#1f2937" }}>Time Allocation Report</div>
                <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>
                  By person &amp; project — compare allocated hours to time entry tool
                </div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:11, color:"#9ca3af" }}>
                  {structure.length} people · {allRows.length} assignments
                </span>
                <button onClick={downloadCSV}
                  style={{ fontSize:11, fontWeight:700, padding:"7px 14px", background:"#fff", color:"#374151",
                    border:"1px solid rgba(0,0,0,0.15)", borderRadius:7, cursor:"pointer", fontFamily:"inherit" }}>
                  ↓ CSV
                </button>
                <button onClick={downloadExcel}
                  style={{ fontSize:11, fontWeight:700, padding:"7px 14px", background:"#1d6f42", color:"#fff",
                    border:"none", borderRadius:7, cursor:"pointer", fontFamily:"inherit" }}>
                  ↓ Excel
                </button>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display:"flex", gap:20, padding:"7px 18px", borderBottom:"1px solid rgba(0,0,0,0.05)", background:"#fafafa" }}>
              {[["Total Allocated","#002A4E"],["Completed","#10b981"],["Pending","#f59e0b"]].map(([l,c]) => (
                <div key={l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#6b7280" }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:c }} />{l}
                </div>
              ))}
              <div style={{ marginLeft:"auto", fontSize:11, color:"#9ca3af" }}>S=1h · M=4h · L=8h or custom hours</div>
            </div>

            {/* Table */}
            <div style={{ overflowX:"auto", maxHeight:600, overflowY:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    <th style={colH({ width:160 })}>Person</th>
                    <th style={colH({ width:100 })}>Project #</th>
                    <th style={colH({ width:120 })}>Client</th>
                    <th style={colH()}>Project</th>
                    <th style={colH({ width:90, textAlign:"right" })}>Total (h)</th>
                    <th style={colH({ width:85, textAlign:"right" })}>Done (h)</th>
                    <th style={colH({ width:85, textAlign:"right" })}>Pending (h)</th>
                    <th style={colH({ width:55, textAlign:"right" })}>Tasks</th>
                  </tr>
                </thead>
                <tbody>
                  {structure.map(person => (
                    <React.Fragment key={person.personId}>
                      {/* Person header row */}
                      <tr style={{ background:"#002A4E" }}>
                        <td colSpan={4} style={{ ...cell(), fontWeight:800, color:"#fff", fontSize:13, paddingTop:9, paddingBottom:9 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                            <div style={{ width:24, height:24, borderRadius:"50%", background:person.personColor,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              fontSize:9, fontWeight:800, color:"#fff", flexShrink:0 }}>
                              {person.personName.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                            </div>
                            {person.personName}
                            <span style={{ fontSize:10, fontWeight:500, color:"rgba(255,255,255,0.5)" }}>
                              {person.projects.length} project{person.projects.length!==1?"s":""}
                            </span>
                          </div>
                        </td>
                        <td style={{ ...cell({ textAlign:"right", fontWeight:800, color:"#50C0C0", fontSize:13 }), paddingTop:9, paddingBottom:9 }}>{person.totalHrs}h</td>
                        <td style={{ ...cell({ textAlign:"right", fontWeight:700, color:"#34d399" }), paddingTop:9, paddingBottom:9 }}>{person.completedHrs}h</td>
                        <td style={{ ...cell({ textAlign:"right", fontWeight:700, color:"#fbbf24" }), paddingTop:9, paddingBottom:9 }}>{person.pendingHrs}h</td>
                        <td style={{ ...cell({ textAlign:"right", color:"rgba(255,255,255,0.4)", fontSize:11 }) }}>{person.taskCount}</td>
                      </tr>

                      {/* Project rows */}
                      {person.projects.map((r, ri) => {
                        const pct = r.totalHrs > 0 ? Math.round((r.completedHrs/r.totalHrs)*100) : 0;
                        return (
                          <tr key={r.projectId} style={{ background: ri%2===0 ? "#fff" : "rgba(0,0,0,0.015)" }}>
                            <td style={{ ...cell({ paddingLeft:20, color:"#9ca3af", fontSize:11 }) }}></td>
                            <td style={{ ...cell({ fontFamily:"monospace", fontSize:11,
                              color: r.projectNumber ? "#374151" : "#d1d5db",
                              fontWeight: r.projectNumber ? 600 : 400 }) }}>
                              {r.projectNumber || "—"}
                            </td>
                            <td style={{ ...cell({ color:"#6b7280", fontSize:11 }) }}>{r.client}</td>
                            <td style={{ ...cell() }}>
                              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                                <div style={{ width:7, height:7, borderRadius:2, background:r.color, flexShrink:0 }} />
                                <span style={{ color:"#1f2937", fontWeight:500 }}>{r.projectName}</span>
                                {pct===100 && <span style={{ fontSize:9, color:"#10b981", background:"rgba(16,185,129,0.1)", borderRadius:3, padding:"1px 5px", fontWeight:700 }}>Done</span>}
                              </div>
                              <div style={{ height:2, background:"#f3f4f6", borderRadius:2, marginTop:3, marginLeft:14 }}>
                                <div style={{ height:2, background:r.color, borderRadius:2, width:`${pct}%` }} />
                              </div>
                            </td>
                            <td style={{ ...cell({ textAlign:"right", fontWeight:700, color:"#374151" }) }}>{r.totalHrs}h</td>
                            <td style={{ ...cell({ textAlign:"right", color:"#10b981" }) }}>{r.completedHrs}h</td>
                            <td style={{ ...cell({ textAlign:"right", color:"#f59e0b" }) }}>{r.pendingHrs}h</td>
                            <td style={{ ...cell({ textAlign:"right", color:"#9ca3af", fontSize:11 }) }}>{r.taskCount}</td>
                          </tr>
                        );
                      })}
                      {/* Spacer */}
                      <tr><td colSpan={8} style={{ height:6, background:"rgba(0,42,78,0.03)" }} /></tr>
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:"#f8fafc", borderTop:"2px solid rgba(0,0,0,0.1)" }}>
                    <td colSpan={4} style={{ ...cell({ fontWeight:800, color:"#1f2937", fontSize:13 }) }}>Grand Total</td>
                    <td style={{ ...cell({ textAlign:"right", fontWeight:800, color:"#002A4E", fontSize:13 }) }}>{grand.total}h</td>
                    <td style={{ ...cell({ textAlign:"right", fontWeight:800, color:"#10b981" }) }}>{grand.done}h</td>
                    <td style={{ ...cell({ textAlign:"right", fontWeight:800, color:"#f59e0b" }) }}>{grand.pending}h</td>
                    <td style={{ ...cell({ textAlign:"right", color:"#9ca3af" }) }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style={{ padding:"10px 18px", borderTop:"1px solid rgba(0,0,0,0.06)", background:"#fafafa", fontSize:11, color:"#9ca3af" }}>
              📌 Add project numbers in each project's settings (Project Details). Excel export includes 3 tabs: Detail, By Person, and By Client.
            </div>
          </div>
        );
      })()}


    </div>
  );
}


function StatusView({ projects, people, statusNotes, onUpdateNote, onAddDeliverable, onAddSubtask, onSaveTrackOverride, onEditItem, onOpenProject }) {
  const [trackOpenId, setTrackOpenId] = useState(null); // del.id whose track dropdown is open

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
      // Auto-derive display status: if any subtask is In Progress/Done, show In Progress
      // Compute display status: auto-promote to In Progress when subtasks have started
      const allSubsDone = del.subtasks.length > 0 && del.subtasks.every(s => s.status === "Done");
      const anySubActive = del.subtasks.some(s => s.status === "In Progress" || s.status === "Done");
      const displayStatus = del.status === "Done" ? "Done"
        : allSubsDone ? "Done"
        : del.status === "Not Started" && anySubActive ? "In Progress"
        : del.status;
      const assigneeNames = (del.assignees || [])
        .map(id => people.find(p => p.id === id))
        .filter(Boolean)
        .map(p => p.name.split(" ")[0])
        .join(", ");
      const key = `${proj.id}::${del.id}`;
      const activeSub = del.subtasks.find(s => s.status === "In Progress") || del.subtasks.find(s => s.status !== "Done");
      const taskEnd = activeSub?.end || del.end || "";
      return { proj, del, track, displayStatus, assigneeNames, note: statusNotes[key] || "", key, taskEnd, activeSub };
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
        <div style={{ display: "grid", gridTemplateColumns: "minmax(75px,0.9fr) minmax(95px,1.2fr) minmax(100px,1.3fr) minmax(100px,1.3fr) minmax(110px,0.85fr) minmax(90px,0.7fr) minmax(65px,0.6fr) minmax(65px,0.6fr) minmax(65px,0.6fr) minmax(110px,1.8fr) minmax(65px,0.65fr)", gap: 0, borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#eceef2" }}>
          {[["Client","client"],["Project","project"],["Deliverable","deliverable"],["Current Task",null],["Health","track"],["Dept",null],["Proj Due","due"],["Task Due","taskdue"],["Team","assigned"],["Notes",null],["",null]].map(([h, col], i) => (
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
        {filtered.map(({ proj, del, track, assigneeNames, note, key, taskEnd, activeSub }, i) => {
          const m = trackMeta[track] || trackMeta["on-track"];
          const currentTask = getCurrentTask(del);
          const isDone = track === "done";
          return (
            <div key={key} style={{
              display: "grid", gridTemplateColumns: "minmax(75px,0.9fr) minmax(95px,1.2fr) minmax(100px,1.3fr) minmax(100px,1.3fr) minmax(110px,0.85fr) minmax(90px,0.7fr) minmax(65px,0.6fr) minmax(65px,0.6fr) minmax(65px,0.6fr) minmax(110px,1.8fr) minmax(65px,0.65fr)",
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
                    <div style={{ width: `${delProgress(del)}%`, height: "100%", background: proj.color, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 9, color: "#6b7280", flexShrink: 0 }}>{delProgress(del)}%</span>
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

              {/* Track — with manual override (React state dropdown) */}
              <Cell border>
                <div style={{ position: "relative" }} data-no-pan>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: m.bg, color: m.color, border: `1px solid ${m.color}40`,
                    borderRadius: 4, padding: "3px 7px", fontSize: 10, fontWeight: 700,
                    whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
                  }}
                    title="Click to override track status"
                    onClick={e => { e.stopPropagation(); setTrackOpenId(id => id === del.id ? null : del.id); }}
                  >{m.icon} {m.label} ▾</span>
                  {trackOpenId === del.id && (
                    <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 200,
                      background: "#fff", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 6,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: 130, overflow: "hidden" }}>
                      <div onClick={() => { setTrackOpenId(null); onSaveTrackOverride(proj.id, del.id, null); }}
                        style={{ padding: "8px 12px", fontSize: 11, cursor: "pointer", color: "#6b7280",
                          borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                        onMouseEnter={e=>e.currentTarget.style.background="#f5f6f8"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                      >— Auto —</div>
                      {TRACK_OPTIONS.map(t => {
                        const tm = trackMeta[t]; if (!tm) return null;
                        return (
                          <div key={t} onClick={() => { setTrackOpenId(null); onSaveTrackOverride(proj.id, del.id, t); }}
                            style={{ padding: "8px 12px", fontSize: 11, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 6,
                              background: del.trackOverride === t ? tm.bg : "transparent" }}
                            onMouseEnter={e=>e.currentTarget.style.background=tm.bg}
                            onMouseLeave={e=>e.currentTarget.style.background=del.trackOverride===t?tm.bg:"transparent"}
                          >
                            <span>{tm.icon}</span>
                            <span style={{ color: tm.color, fontWeight: 700 }}>{tm.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Cell>

              {/* Department — shows active task's dept, falls back to deliverable */}
              <Cell border>
                {(() => {
                  const dept = activeSub?.department || del.department;
                  return dept
                    ? <DeptBadge dept={dept} />
                    : <span style={{ fontSize: 10, color: "#9ca3af" }}>—</span>;
                })()}
              </Cell>

              {/* Due Date */}
              <Cell border>
                <span style={{ fontSize: 11, fontWeight: 600, color: del.end && parseDate(del.end) < TODAY && del.status !== "Done" ? "#f87171" : "#374151", whiteSpace: "nowrap" }}>
                  {del.end ? fmt(parseDate(del.end)) : "—"}
                </span>
              </Cell>

              {/* Task Due — active subtask's end date */}
              <Cell border>
                <span style={{ fontSize: 11, fontWeight: 600, color: taskEnd && parseDate(taskEnd) < TODAY && !isDone ? "#f87171" : "#374151", whiteSpace: "nowrap" }}>
                  {taskEnd && taskEnd !== del.end ? fmt(parseDate(taskEnd)) : "—"}
                </span>
              </Cell>

              {/* Team — show assignees of the active task (subtask or leaf deliverable) */}
              <Cell border>
                {(() => {
                  // Prefer the most urgent active subtask's assignees; fall back to deliverable assignees
                  const activeTask = del.subtasks.find(s => s.status === "In Progress")
                    || del.subtasks.find(s => s.status !== "Done")
                    || del;
                  const assigneeIds = activeTask.assignees || del.assignees || [];
                  return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  {assigneeIds.slice(0, 3).map(id => {
                    const p = people.find(x => x.id === id);
                    return p ? <div key={id} title={p.name}><Avatar person={p} size={20} /></div> : null;
                  })}
                  {assigneeIds.length === 0 && <span style={{ fontSize: 10, color: "#9ca3af" }}>—</span>}
                  {assigneeIds.length > 3 && <span style={{ fontSize: 9, color: "#6b7280" }}>+{assigneeIds.length - 3}</span>}
                </div>
                );
                })()}
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
    <div style={{ padding: "8px 10px", display: "flex", alignItems: "flex-start", minWidth: 0 }}>
      {editing ? (
        <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Escape") { setDraft(note); setEditing(false); } if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); } }}
          style={{ width: "100%", border: `1px solid ${color}60`, borderRadius: 4, padding: "4px 8px", fontSize: 11, fontFamily: "inherit", resize: "vertical", minHeight: 48, outline: "none", background: "#fff", color: "#1f2937", lineHeight: 1.5 }}
        />
      ) : note ? (
        <div style={{ flex: 1, cursor: "text" }} onClick={() => setEditing(true)}>
          <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{note}</div>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} style={{ background: "none", border: "1px dashed rgba(0,0,0,0.1)", borderRadius: 4, color: "#9ca3af", cursor: "pointer", padding: "3px 8px", fontSize: 10, fontFamily: "inherit", whiteSpace: "nowrap" }}>+ note</button>
      )}
    </div>
  );
}

// --- TEAM SETTINGS MODAL ─────────────────────────────────────────────────────

function TeamSettingsModal({ people, onClose, onSave, sbUrl = "", sbKey = "" }) {
  const [tab, setTab] = useState("team");
  const [members, setMembers] = useState(people.map(p => ({ ...p })));
  const updateMember = (id, field, val) =>
    setMembers(ms => ms.map(m => m.id !== id ? m : { ...m, [field]: val }));
  const addMember = () => {
    const usedColors = members.map(m => m.color);
    const color = MEMBER_COLORS.find(c => !usedColors.includes(c)) || MEMBER_COLORS[0];
    setMembers(ms => [...ms, { id: "p_" + Date.now(), name: "", color }]);
  };
  const removeMember = (id) => setMembers(ms => ms.filter(m => m.id !== id));
  const handleSave = () => { onSave(members.filter(m => m.name.trim())); onClose(); };

  // ── Invite state ────────────────────────────────────────────────────────────
  const [invEmail, setInvEmail]     = useState("");
  const [invName,  setInvName]      = useState("");
  const [invRole,  setInvRole]      = useState("member");
  const [invMember,setInvMember]    = useState(people[0]?.id || "");
  const [invStatus,setInvStatus]    = useState(null); // null | "sending" | "done" | "sql" | "error"
  const [invResult,setInvResult]    = useState(null); // { sql, message } or error string
  // Service role key removed — invite flow now uses anon key + admin UI
  // Admin invites should be handled via Supabase Dashboard or a server-side Edge Function

  const handleInvite = async () => {
    if (!invEmail.trim()) return;
    setInvStatus("sending");
    // ── Security note ─────────────────────────────────────────────────────
    // Sending admin invites requires the Supabase service role key,
    // which must NEVER be exposed in frontend code.
    // Two safe options:
    //   A. Send invites from Supabase Dashboard → Authentication → Users → Invite user
    //   B. Build a Supabase Edge Function that accepts { email } and sends the invite server-side
    // For now we insert the app_users row manually and show setup instructions.
    // ─────────────────────────────────────────────────────────────────────
    const linkedPerson = people.find(p => p.id === invMember);
    if (!linkedPerson) { setInvStatus("error"); setInvMsg("Select a team member first."); return; }

    // Insert the app_users row via RLS (requires admin role in Supabase)
    if (SB_READY) {
      const r = await sb.upsert("app_users", {
        id: "pending-" + Date.now(), // placeholder until real auth UUID is known
        email: invEmail.trim(),
        display_name: linkedPerson.name,
        role: invRole || "member",
        team_member_id: invMember,
      });
      if (r?.error) {
        setInvStatus("error");
        setInvMsg("Could not create user record: " + (r.error?.message || r.error));
        return;
      }
    }
    setInvStatus("manual");
    setInvMsg(`Ready. Now go to Supabase Dashboard → Authentication → Users → Invite user, enter ${invEmail.trim()}.`);
  };
  const tabStyle = (t) => ({
    flex: 1, padding: "10px 0", textAlign: "center", fontSize: 11, fontWeight: 700,
    letterSpacing: "0.06em", cursor: "pointer", userSelect: "none",
    borderBottom: tab === t ? "2px solid #38bdf8" : "2px solid transparent",
    color: tab === t ? "#0284c7" : "#6b7280", transition: "all 0.12s",
  });

  return (
    <Overlay onClose={onClose}>
      <ModalShell title="Team Settings" onClose={onClose} accentColor="#38bdf8" width={820}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={tabStyle("team")} onClick={() => setTab("team")}>TEAM MEMBERS</div>
          <div style={tabStyle("access")} onClick={() => setTab("access")}>ACCESS & INVITES</div>
        </div>

        {/* ── Team Members tab ── */}
        {tab === "team" && (
          <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: fs(11), color: "#6b7280", marginBottom: 4 }}>
              Edit names, colors, and annual client-hour targets. Default target: 1,850 hrs/year.
            </div>
            {members.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Avatar person={{ ...m, name: m.name || "?" }} size={34} />
                  <select value={m.color} onChange={e => updateMember(m.id, "color", e.target.value)}
                    style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
                    title="Change color">
                    {MEMBER_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <input value={m.name} onChange={e => updateMember(m.id, "name", e.target.value)}
                  placeholder="Full name" style={{ ...selectStyle, flex: 1, minWidth: 120, fontSize: 13 }} />
              <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                <input type="number" min="0" max="5000" step="50"
                  value={m.annualTarget ?? 1850}
                  onChange={e => updateMember(m.id, "annualTarget", parseInt(e.target.value) || 1850)}
                  title="Annual client-hour target"
                  style={{ ...selectStyle, width:68, fontSize:11, textAlign:"center" }} />
                {/* Department for auto-populate */}
                <select
                  value={m.department || ""}
                  onChange={e => updateMember(m.id, "department", e.target.value)}
                  title="Default work type / department"
                  style={{ ...selectStyle, fontSize:11, minWidth:110 }}>
                  <option value="">No dept.</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span style={{ fontSize:9, color:"#9ca3af", whiteSpace:"nowrap" }}>hrs/yr</span>
              </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {MEMBER_COLORS.map(c => (
                    <div key={c} onClick={() => updateMember(m.id, "color", c)} style={{
                      width: 16, height: 16, borderRadius: "50%", background: c, cursor: "pointer",
                      border: m.color === c ? "2px solid #111" : "2px solid transparent", flexShrink: 0,
                    }} />
                  ))}
                </div>
                <button onClick={() => removeMember(m.id)} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px", flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                  onMouseLeave={e => e.currentTarget.style.color = "#9ca3af"}>×</button>
              </div>
            ))}
            <button onClick={addMember} style={{ marginTop: 4, background: "none", border: "1px dashed rgba(0,0,0,0.09)", borderRadius: 6, color: "#9ca3af", padding: "7px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(56,189,248,0.6)"; e.currentTarget.style.color = "#0284c7"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.09)"; e.currentTarget.style.color = "#9ca3af"; }}>
              + Add team member
            </button>
          </div>
        )}

        {/* ── Access & Invites tab ── */}
        {tab === "access" && (
          <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Existing access rows */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
                Current Team Access
              </div>
              {people.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af" }}>No team members yet.</div>}
              {people.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <Avatar person={p} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1f2937" }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>ID: {p.id}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", background: "rgba(0,0,0,0.05)", borderRadius: 4, padding: "2px 8px" }}>
                    team member
                  </span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>
                Invite New User
              </div>

              {invStatus === "done" && (
                <div style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>✓ Invite sent</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{invResult?.message}</div>
                </div>
              )}

              {invStatus === "sql" && invResult && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>Two-step manual setup required</div>
                    <div style={{ fontSize:11, color:"#6b7280", lineHeight:1.6, marginTop:8 }}>
                    To invite users, go to your{" "}
                    <strong>Supabase Dashboard → Authentication → Users → Invite user</strong>.
                    After accepting, the user's auth ID will appear in Supabase and you can link it here.
                  </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                    Copy this SQL and run it in Supabase → SQL Editor after inviting the user:
                  </div>
                  <div style={{ position: "relative" }}>
                    <pre style={{ background: "#1e293b", color: "#e2e8f0", borderRadius: 8, padding: "12px 14px", fontSize: 10, lineHeight: 1.6, overflowX: "auto", margin: 0, fontFamily: "monospace" }}>
                      {invResult.sql}
                    </pre>
                    <button
                      onClick={() => { navigator.clipboard?.writeText(invResult.sql); }}
                      style={{ position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, color: "#e2e8f0", fontSize: 10, cursor: "pointer", padding: "3px 8px", fontFamily: "inherit" }}>
                      Copy
                    </button>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: "#6b7280", lineHeight: 1.6 }}>
                    <b>Step 1:</b> Go to <b>Supabase → Authentication → Users → Invite User</b>, enter <b>{invResult.email}</b>.<br />
                    <b>Step 2:</b> After they accept, copy their UUID from the Users table and paste it into the SQL above, then run it.
                  </div>
                  <button onClick={() => { setInvStatus(null); setInvResult(null); }} style={{ marginTop: 10, background: "none", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 6, color: "#6b7280", padding: "6px 14px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
                    Invite another
                  </button>
                </div>
              )}

              {(invStatus === null || invStatus === "sending") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Email *</div>
                      <input type="email" value={invEmail} onChange={e => setInvEmail(e.target.value)}
                        placeholder="name@company.com"
                        style={{ ...selectStyle, width: "100%" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Display Name</div>
                      <input value={invName} onChange={e => setInvName(e.target.value)}
                        placeholder="Optional"
                        style={{ ...selectStyle, width: "100%" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Role</div>
                      <select value={invRole} onChange={e => setInvRole(e.target.value)} style={{ ...selectStyle, width: "100%" }}>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>Link to Team Member</div>
                      <select value={invMember} onChange={e => setInvMember(e.target.value)} style={{ ...selectStyle, width: "100%" }}>
                        <option value="">— not linked —</option>
                        {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                  {!serviceKey && (
                    <div style={{ fontSize: 10, color: "#9ca3af", background: "rgba(0,0,0,0.03)", borderRadius: 6, padding: "8px 10px", lineHeight: 1.5 }}>
                      💡 For one-click invites, add <code style={{ background: "rgba(0,0,0,0.06)", borderRadius: 3, padding: "1px 4px" }}>window.__SB_SERVICE_KEY__ = "your-service-role-key"</code> to <code style={{ background: "rgba(0,0,0,0.06)", borderRadius: 3, padding: "1px 4px" }}>main.jsx</code>. Without it, you'll get SQL to run manually.
                    </div>
                  )}
                  <button
                    onClick={handleInvite}
                    disabled={!invEmail.trim() || invStatus === "sending"}
                    style={{ padding: "10px 0", borderRadius: 7, background: invEmail.trim() ? "#38bdf8" : "rgba(0,0,0,0.07)", border: "none", color: invEmail.trim() ? "#fff" : "#9ca3af", fontSize: 12, fontWeight: 700, cursor: invEmail.trim() ? "pointer" : "default", fontFamily: "inherit", transition: "all 0.12s" }}>
                    {invStatus === "sending" ? "Sending…" : serviceKey ? "Send Invite Email" : "Generate Setup SQL"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "team" && <ModalFooter onClose={onClose} onSave={handleSave} saveLabel="Save Team" color="#38bdf8" />}
        {tab === "access" && (
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", padding: "14px 20px", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={onClose} style={cancelBtnStyle}>Close</button>
          </div>
        )}
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

    const today = new Date().toLocaleDateString("en-CA");
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
// ─── BUILT-IN TEMPLATES ──────────────────────────────────────────────────────
const BUILT_IN_TEMPLATES = [
  {
    id: "tpl_brand_launch", name: "Brand Launch", icon: "🚀",
    deliverables: [
      { title: "Discovery & Strategy", subtasks: ["Kickoff meeting", "Brand audit", "Competitor research", "Strategy presentation"] },
      { title: "Brand Identity", subtasks: ["Logo concepts", "Logo refinement", "Color palette & typography", "Brand guidelines"] },
      { title: "Collateral Design", subtasks: ["Business cards", "Letterhead", "Email signature", "Social media templates"] },
      { title: "Digital Assets", subtasks: ["Website banners", "Social profile images", "Icon set", "Presentation template"] },
      { title: "Launch", subtasks: ["Internal rollout", "Asset delivery", "Client training", "Project close"] },
    ],
  },
  {
    id: "tpl_website_redesign", name: "Website Redesign", icon: "🌐",
    deliverables: [
      { title: "Discovery", subtasks: ["Stakeholder interviews", "Content audit", "Analytics review", "Requirements doc"] },
      { title: "UX & Wireframes", subtasks: ["Sitemap", "User flows", "Wireframes", "Wireframe review"] },
      { title: "Visual Design", subtasks: ["Moodboard", "Homepage design", "Inner page templates", "Design review & approval"] },
      { title: "Development", subtasks: ["Dev environment setup", "Frontend build", "CMS integration", "QA testing"] },
      { title: "Launch", subtasks: ["Content migration", "SEO setup", "Staging review", "Go-live"] },
    ],
  },
  {
    id: "tpl_campaign", name: "Marketing Campaign", icon: "📣",
    deliverables: [
      { title: "Strategy", subtasks: ["Brief", "Audience research", "Channel plan", "KPI definition"] },
      { title: "Creative", subtasks: ["Concept development", "Copywriting", "Design", "Creative review"] },
      { title: "Production", subtasks: ["Ad build", "Landing page", "Email template", "Social assets"] },
      { title: "Launch & Optimise", subtasks: ["Campaign setup", "Launch", "Week 1 review", "Optimisations"] },
    ],
  },
  {
    id: "tpl_annual_report", name: "Annual Report", icon: "📊",
    deliverables: [
      { title: "Content Gathering", subtasks: ["Financial data", "Department summaries", "Photography", "Executive messages"] },
      { title: "Design", subtasks: ["Cover concepts", "Layout design", "Infographics", "Design approval"] },
      { title: "Production", subtasks: ["Copyediting", "Proofing round 1", "Proofing round 2", "Final approval"] },
      { title: "Print & Distribution", subtasks: ["Print-ready files", "Printer liaison", "Digital PDF", "Distribution"] },
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

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERABLE TEMPLATE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

// ── Apply a deliverable template to a project ─────────────────────────────────
function applyDeliverableTemplate(tpl, projectId, startDateStr) {
  const taskIdMap = {}; // templateTaskId → newTaskId
  const today = startDateStr || new Date().toISOString().slice(0, 10);

  // Pre-generate all new task IDs so we can remap deps
  (tpl.tasks || []).forEach(t => {
    taskIdMap[t.id] = "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6) + "_" + t.id.slice(-4);
  });

  let cursor = today;
  const tasks = (tpl.tasks || []).map((t, idx) => {
    const dur = t.duration || 2;
    const end = addWorkingDays(cursor, dur - 1);
    const newId = taskIdMap[t.id];
    const remappedDeps = (t.deps || []).map(d => taskIdMap[d] || d).filter(Boolean);
    const task = {
      id: newId,
      title: t.title || "Task",
      status: "Not Started",
      priority: "Medium",
      effort: t.effort || "M",
      customHours: t.customHours || null,
      department: t.department || "",
      assignees: [],
      start: cursor,
      end,
      notes: t.notes || "",
      dependencies: remappedDeps,
      progress: 0,
    };
    cursor = addWorkingDays(end, 1);
    return task;
  });

  const delDur = tpl.duration || Math.max(tasks.length * 3, 7);
  const delEnd = addWorkingDays(today, delDur - 1);

  return {
    id: "d_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    title: tpl.title || tpl.name || "Deliverable",
    status: tpl.status || "Not Started",
    priority: tpl.priority || "Medium",
    department: tpl.department || "",
    assignees: [],
    start: today,
    end: delEnd,
    notes: tpl.notes || "",
    dependencies: [],
    subtasks: tasks,
    progress: 0,
    fromTemplateId: tpl.id,
  };
}

// ── Deliverable Template Manager ─────────────────────────────────────────────
function DeliverableTemplateManager({ onClose, deliverableTemplates, onSave, onDelete, onDuplicate }) {
  const [view, setView] = useState("list"); // "list" | "edit"
  const [editing, setEditing] = useState(null); // template object being edited

  const inputStyle  = { width:"100%", fontSize:12, border:"1px solid rgba(0,0,0,0.12)", borderRadius:7, padding:"7px 10px", fontFamily:"inherit", background:"#fff", outline:"none", boxSizing:"border-box" };
  const labelStyle  = { fontSize:10, fontWeight:700, color:"#6b7280", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:4, display:"block" };
  const selectStyle = { width:"100%", background:"#f7f8fa", border:"1px solid rgba(0,0,0,0.08)", borderRadius:6, color:"#111827", padding:"7px 10px", fontFamily:"inherit", fontSize:12, boxSizing:"border-box" };

  const startNew = () => {
    setEditing({
      id: "dt_" + Date.now(),
      name: "",
      title: "",
      department: "",
      notes: "",
      duration: 5,
      status: "Not Started",
      priority: "Medium",
      tasks: [],
    });
    setView("edit");
  };

  const handleEdit = (tpl) => {
    setEditing(JSON.parse(JSON.stringify(tpl))); // deep clone
    setView("edit");
  };

  const handleSave = () => {
    if (!editing) return;
    onSave(editing);
    setView("list");
    setEditing(null);
  };

  const addTask = () => {
    const newId = "tt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 5);
    setEditing(e => ({ ...e, tasks: [...(e.tasks || []), {
      id: newId, title: "", department: "", effort: "M", customHours: null,
      duration: 1, notes: "", deps: [],
    }] }));
  };

  const updateTask = (idx, field, val) => {
    setEditing(e => ({ ...e, tasks: e.tasks.map((t, i) => i !== idx ? t : { ...t, [field]: val }) }));
  };

  const removeTask = (idx) => {
    const removed = editing.tasks[idx].id;
    setEditing(e => ({
      ...e,
      tasks: e.tasks
        .filter((_, i) => i !== idx)
        .map(t => ({ ...t, deps: (t.deps || []).filter(d => d !== removed) })),
    }));
  };

  const moveTask = (idx, dir) => {
    setEditing(e => {
      const arr = [...e.tasks];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return e;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return { ...e, tasks: arr };
    });
  };

  const toggleDep = (taskIdx, depId) => {
    setEditing(e => ({
      ...e,
      tasks: e.tasks.map((t, i) => {
        if (i !== taskIdx) return t;
        const deps = t.deps || [];
        return { ...t, deps: deps.includes(depId) ? deps.filter(d => d !== depId) : [...deps, depId] };
      }),
    }));
  };

  // ── List view ───────────────────────────────────────────────────────────────
  if (view === "list") return (
    <Overlay onClose={onClose}>
      <ModalShell title="Deliverable Templates" onClose={onClose} accentColor="#6366f1" width={600}>
        <div style={{ padding:"16px 22px 0" }}>
          <button onClick={startNew} style={{ width:"100%", padding:"10px 0", borderRadius:8, background:"#6366f1", border:"none", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:16 }}>
            + New Template
          </button>
          {deliverableTemplates.length === 0 && (
            <div style={{ textAlign:"center", color:"#9ca3af", fontSize:12, padding:"32px 0" }}>
              No templates yet. Create one to get started.
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:420, overflowY:"auto" }}>
            {deliverableTemplates.map(tpl => (
              <div key={tpl.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"#f8fafc", borderRadius:8, border:"1px solid rgba(0,0,0,0.07)" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1f2937" }}>{tpl.name || "Unnamed"}</div>
                  <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>
                    {tpl.title && <span>{tpl.title} · </span>}
                    {(tpl.tasks||[]).length} task{(tpl.tasks||[]).length !== 1 ? "s" : ""}
                    {tpl.department && <span> · {tpl.department}</span>}
                  </div>
                </div>
                <button onClick={() => handleEdit(tpl)} style={{ fontSize:11, fontWeight:600, color:"#6366f1", background:"rgba(99,102,241,0.08)", border:"none", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontFamily:"inherit" }}>Edit</button>
                <button onClick={() => onDuplicate(tpl)} style={{ fontSize:11, fontWeight:600, color:"#6b7280", background:"rgba(0,0,0,0.05)", border:"none", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontFamily:"inherit" }}>Copy</button>
                <button onClick={() => { if (window.confirm(`Delete "${tpl.name}"? Existing deliverables are unaffected.`)) onDelete(tpl.id); }}
                  style={{ fontSize:11, fontWeight:600, color:"#ef4444", background:"rgba(239,68,68,0.08)", border:"none", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontFamily:"inherit" }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
        <div style={{ borderTop:"1px solid rgba(0,0,0,0.07)", padding:"14px 20px", display:"flex", justifyContent:"flex-end" }}>
          <button onClick={onClose} style={cancelBtnStyle}>Close</button>
        </div>
      </ModalShell>
    </Overlay>
  );

  // ── Edit view ───────────────────────────────────────────────────────────────
  if (!editing) return null;
  const setF = (k, v) => setEditing(e => ({ ...e, [k]: v }));

  return (
    <Overlay onClose={() => { setView("list"); setEditing(null); }}>
      <ModalShell title={editing.id && deliverableTemplates.find(t=>t.id===editing.id) ? "Edit Template" : "New Template"}
        onClose={() => { setView("list"); setEditing(null); }} accentColor="#6366f1" width={680}>
        <div style={{ padding:"18px 22px", display:"flex", flexDirection:"column", gap:14, maxHeight:"72vh", overflowY:"auto" }}>

          {/* Template meta */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={labelStyle}>Template Name *</label>
              <input value={editing.name} onChange={e => setF("name", e.target.value)}
                placeholder="e.g. Email Campaign" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Default Deliverable Title</label>
              <input value={editing.title || ""} onChange={e => setF("title", e.target.value)}
                placeholder="Leave blank to use template name" style={inputStyle} />
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }}>
            <div>
              <label style={labelStyle}>Department</label>
              <select value={editing.department || ""} onChange={e => setF("department", e.target.value)} style={selectStyle}>
                <option value="">— None —</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Default Duration (days)</label>
              <input type="number" min="1" max="365" value={editing.duration || 5}
                onChange={e => setF("duration", parseInt(e.target.value)||5)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Default Status</label>
              <select value={editing.status || "Not Started"} onChange={e => setF("status", e.target.value)} style={selectStyle}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Default Priority</label>
              <select value={editing.priority || "Medium"} onChange={e => setF("priority", e.target.value)} style={selectStyle}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Deliverable Notes / Process Guidance</label>
            <textarea value={editing.notes || ""} onChange={e => setF("notes", e.target.value)}
              placeholder="e.g. This deliverable requires editorial approval before design starts."
              style={{ ...inputStyle, minHeight:60, resize:"vertical" }} />
          </div>

          {/* Tasks */}
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:800, color:"#1f2937", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                Tasks ({(editing.tasks||[]).length})
              </span>
              <button onClick={addTask} style={{ fontSize:11, fontWeight:700, color:"#6366f1", background:"rgba(99,102,241,0.08)", border:"none", borderRadius:6, padding:"5px 12px", cursor:"pointer", fontFamily:"inherit" }}>
                + Add Task
              </button>
            </div>

            {(editing.tasks||[]).length === 0 && (
              <div style={{ textAlign:"center", color:"#9ca3af", fontSize:11, padding:"16px 0", background:"rgba(0,0,0,0.02)", borderRadius:7 }}>
                No tasks yet. Add tasks to define the workflow for this deliverable.
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {(editing.tasks||[]).map((task, idx) => (
                <div key={task.id} style={{ background:"#f8fafc", border:"1px solid rgba(0,0,0,0.07)", borderRadius:8, padding:"12px 14px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:2, flexShrink:0 }}>
                      <button onClick={() => moveTask(idx, -1)} disabled={idx===0}
                        style={{ background:"none", border:"none", color:idx===0?"#d1d5db":"#6b7280", cursor:idx===0?"default":"pointer", fontSize:10, padding:"1px 4px", lineHeight:1 }}>▲</button>
                      <button onClick={() => moveTask(idx, 1)} disabled={idx===(editing.tasks.length-1)}
                        style={{ background:"none", border:"none", color:idx===(editing.tasks.length-1)?"#d1d5db":"#6b7280", cursor:idx===(editing.tasks.length-1)?"default":"pointer", fontSize:10, padding:"1px 4px", lineHeight:1 }}>▼</button>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, color:"#9ca3af", minWidth:18 }}>{idx+1}.</span>
                    <input value={task.title} onChange={e => updateTask(idx, "title", e.target.value)}
                      placeholder="Task title"
                      style={{ ...inputStyle, flex:1 }} />
                    <button onClick={() => removeTask(idx)}
                      style={{ background:"none", border:"none", color:"#fca5a5", cursor:"pointer", fontSize:16, flexShrink:0 }}>×</button>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 70px", gap:8, marginBottom:8 }}>
                    <div>
                      <label style={labelStyle}>Department</label>
                      <select value={task.department||""} onChange={e => updateTask(idx,"department",e.target.value)} style={selectStyle}>
                        <option value="">— None —</option>
                        {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Effort</label>
                      <select value={task.effort||"M"} onChange={e => updateTask(idx,"effort",e.target.value)} style={selectStyle}>
                        {EFFORT_OPTS.map(e=><option key={e} value={e}>{EFFORT_LABEL[e]}</option>)}
                        <option value="C">Custom</option>
                      </select>
                    </div>
                    {task.effort === "C" ? (
                      <div>
                        <label style={labelStyle}>Custom Hours</label>
                        <input type="number" min="0.5" step="0.5" value={task.customHours||1}
                          onChange={e=>updateTask(idx,"customHours",parseFloat(e.target.value)||1)} style={inputStyle} />
                      </div>
                    ) : <div />}
                    <div>
                      <label style={labelStyle}>Days</label>
                      <input type="number" min="1" max="90" value={task.duration||1}
                        onChange={e=>updateTask(idx,"duration",parseInt(e.target.value)||1)} style={inputStyle} />
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom:8 }}>
                    <label style={labelStyle}>Task Notes</label>
                    <input value={task.notes||""} onChange={e=>updateTask(idx,"notes",e.target.value)}
                      placeholder="Instructions or reminders for this task..."
                      style={inputStyle} />
                  </div>

                  {/* Dependencies */}
                  {idx > 0 && (
                    <div>
                      <label style={labelStyle}>Depends on</label>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {(editing.tasks||[]).slice(0, idx).map((prevTask, prevIdx) => {
                          const isSet = (task.deps||[]).includes(prevTask.id);
                          return (
                            <button key={prevTask.id} onClick={() => toggleDep(idx, prevTask.id)}
                              style={{ fontSize:10, fontWeight:600, borderRadius:5, padding:"3px 9px", cursor:"pointer", fontFamily:"inherit", border:`1.5px solid ${isSet?"#6366f1":"rgba(0,0,0,0.12)"}`, background:isSet?"rgba(99,102,241,0.1)":"transparent", color:isSet?"#6366f1":"#6b7280" }}>
                              {prevIdx+1}. {prevTask.title||"Untitled"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop:"1px solid rgba(0,0,0,0.07)", padding:"14px 20px", display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={() => { setView("list"); setEditing(null); }} style={cancelBtnStyle}>Cancel</button>
          <button onClick={handleSave}
            style={{ padding:"8px 22px", borderRadius:7, background:"#6366f1", border:"none", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Save Template
          </button>
        </div>
      </ModalShell>
    </Overlay>
  );
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
function NewDeliverableModal({ project, onClose, onAdd, allPeople, savedTemplates = [], deliverableTemplates = [] }) {
  const today = "2026-05-20";
  const weekOut = "2026-05-27";
  const [form, setForm] = useState({
    title: "", status: "Not Started", priority: "Medium",
    assignees: [], start: today, end: weekOut, progress: 0, dependencies: [], department: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const togglePerson = (id) => {
    const adding = !form.assignees.includes(id);
    set("assignees", adding ? [...form.assignees, id] : form.assignees.filter(x => x !== id));
    if (adding && !form.department && !form._deptManualOverride) {
      const person = (allPeople || []).find(p => p.id === id);
      // Account role spans multiple work types — skip auto-dept
      if (person?.department && person.department !== "Account") set("department", person.department);
    }
  };
  const [error, setError] = useState("");
  const [keepOpen, setKeepOpen] = useState(false);
  const [fromTemplate, setFromTemplate] = useState(null);

  const handleAdd = () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    const id = "d_" + Date.now();
    const tpl = deliverableTemplates.find(t => t.id === fromTemplate);
    const today2 = form.start || new Date().toISOString().slice(0, 10);
    const generated = tpl ? applyDeliverableTemplate(tpl, null, today2) : null;
    const subtasks = generated ? generated.subtasks : [];
    onAdd(project.id, { ...form, id, title: form.title.trim(), notes: form.notes || (tpl?.notes || ""), subtasks });
    if (keepOpen) {
      setForm({ title: "", status: "Not Started", priority: "Medium", assignees: [], start: today, end: weekOut, progress: 0, dependencies: [], department: "" });
      setFromTemplate(null);
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
          {/* Deliverable Template picker */}
          {deliverableTemplates.length > 0 && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#6b7280", letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:6 }}>Start from Template (optional)</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:4 }}>
                {deliverableTemplates.map(tpl => (
                  <button key={tpl.id} onClick={() => {
                    const isSel = fromTemplate === tpl.id;
                    setFromTemplate(isSel ? null : tpl.id);
                    if (!isSel) { set("title", tpl.title || tpl.name); if (tpl.department) set("department", tpl.department); }
                  }}
                    style={{ fontSize:11, fontWeight:600, borderRadius:6, padding:"5px 10px", cursor:"pointer", fontFamily:"inherit", border:`1.5px solid ${fromTemplate===tpl.id?"#6366f1":"rgba(0,0,0,0.12)"}`, background:fromTemplate===tpl.id?"rgba(99,102,241,0.1)":"transparent", color:fromTemplate===tpl.id?"#6366f1":"#6b7280" }}>
                    {tpl.name}{tpl.tasks?.length > 0 ? ` (${tpl.tasks.length}t)` : ""}
                  </button>
                ))}
              </div>
              {fromTemplate && (() => {
                const tpl = deliverableTemplates.find(t => t.id === fromTemplate);
                return tpl ? <div style={{ fontSize:10, color:"#6366f1", background:"rgba(99,102,241,0.06)", borderRadius:5, padding:"5px 10px" }}>Will create {tpl.tasks?.length||0} task{tpl.tasks?.length!==1?"s":""}{tpl.notes ? " · "+tpl.notes.slice(0,60) : ""}</div> : null;
              })()}
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
              <select value={form.department || ""} onChange={e => { set("department", e.target.value); set("_deptManualOverride", true); }} style={selectStyle}>
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
  const togglePerson = (id) => {
    const adding = !form.assignees.includes(id);
    set("assignees", adding ? [...form.assignees, id] : form.assignees.filter(x => x !== id));
    if (adding && !form.department && !form._deptManualOverride) {
      const person = (allPeople || []).find(p => p.id === id);
      // Account role spans multiple work types — skip auto-dept
      if (person?.department && person.department !== "Account") set("department", person.department);
    }
  };
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
              <select value={form.department || ""} onChange={e => { set("department", e.target.value); set("_deptManualOverride", true); }} style={selectStyle}>
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


// ── ChangeHistoryView — admin-only audit log with restore ────────────────────
function ChangeHistoryView({ people, projects, currentUserId, sb, SB_READY }) {
  const [history,       setHistory]       = React.useState([]);
  const [loading,       setLoading]       = React.useState(true);
  const [filterPerson,  setFilterPerson]  = React.useState("");
  const [filterProject, setFilterProject] = React.useState("");
  const [filterAction,  setFilterAction]  = React.useState("");
  const [filterEntity,  setFilterEntity]  = React.useState("");
  const [restoring,     setRestoring]     = React.useState(null);
  const [error,         setError]         = React.useState("");
  const [confirmDel,    setConfirmDel]    = React.useState(null);

  React.useEffect(() => {
    if (!SB_READY) { setLoading(false); return; }
    sb.select("change_history", "order=changed_at.desc&limit=500")
      .then(r => {
        if (r?.data) setHistory(r.data.map(row => ({
          id: row.id, entityType: row.entity_type, entityId: row.entity_id,
          entityTitle: row.entity_title, projectId: row.parent_project_id,
          projectName: row.parent_project_name, deliverableId: row.parent_deliverable_id,
          action: row.action, field: row.field_name,
          oldValue: row.old_value, newValue: row.new_value,
          byPersonId: row.changed_by_person_id, byName: row.changed_by_name,
          byAuthId: row.changed_by_auth_id, at: row.changed_at,
          meta: row.metadata,
        })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [SB_READY]);

  const handleRestore = async (entry) => {
    if (!SB_READY) return;
    setRestoring(entry.id);
    setError("");
    let tableMap = {
      deliverable:"deliverables", subtask:"subtasks", pto:"pto",
      personal_task:"personal_tasks", admin_task:"admin_tasks", template:"deliverable_templates",
    };
    const table = tableMap[entry.entityType];
    if (!table) { setRestoring(null); setError("Restore not supported for " + entry.entityType); return; }

    // For delete actions: un-soft-delete the record
    if (entry.action === "delete") {
      const r = await sb.restore(table, entry.entityId, currentUserId);
      if (r?.error) {
        setError("Restore failed: " + (r.error?.message || r.error));
      } else {
        setHistory(h => h.map(x => x.id === entry.id ? { ...x, action: x.action + " (restored)" } : x));
      }
    }
    // For field-level updates: revert to old value
    else if (entry.action === "update" && entry.field && entry.oldValue !== undefined) {
      const r = await sb.update(table, entry.entityId, { [entry.field]: entry.oldValue });
      if (r?.error) setError("Revert failed: " + (r.error?.message || r.error));
      else setHistory(h => h.map(x => x.id === entry.id ? { ...x, action: x.action + " (reverted)" } : x));
    }
    setRestoring(null);
  };

  const actionColors = {
    create: "#34d399", update: "#38bdf8", delete: "#f87171",
    restore: "#a78bfa", status_change: "#fbbf24", assignment_change: "#fb923c",
  };

  // Apply filters
  const visible = history.filter(h =>
    (!filterPerson  || h.byPersonId === filterPerson) &&
    (!filterProject || h.projectId  === filterProject) &&
    (!filterAction  || h.action.startsWith(filterAction)) &&
    (!filterEntity  || h.entityType === filterEntity)
  );

  const uniqueEntities = [...new Set(history.map(h => h.entityType))].sort();
  const uniqueActions  = [...new Set(history.map(h => h.action))].sort();

  const fmt = (ts) => ts ? new Date(ts).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}) : "";
  const selectSt = { fontSize:11, border:"1px solid rgba(0,0,0,0.1)", borderRadius:6, padding:"5px 10px", fontFamily:"inherit", background:"#fff", color:"#374151" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:900, color:"#1f2937" }}>Change History</div>
          <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{visible.length} of {history.length} entries</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:10, padding:"12px 16px", display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:11, fontWeight:700, color:"#6b7280" }}>FILTER</span>
        <select value={filterPerson} onChange={e=>setFilterPerson(e.target.value)} style={selectSt}>
          <option value="">All people</option>
          {people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterProject} onChange={e=>setFilterProject(e.target.value)} style={selectSt}>
          <option value="">All projects</option>
          {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterEntity} onChange={e=>setFilterEntity(e.target.value)} style={selectSt}>
          <option value="">All types</option>
          {uniqueEntities.map(e=><option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filterAction} onChange={e=>setFilterAction(e.target.value)} style={selectSt}>
          <option value="">All actions</option>
          {uniqueActions.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
        {(filterPerson||filterProject||filterEntity||filterAction) && (
          <button onClick={()=>{setFilterPerson("");setFilterProject("");setFilterEntity("");setFilterAction("");}}
            style={{ fontSize:11, color:"#6b7280", background:"none", border:"1px solid rgba(0,0,0,0.1)", borderRadius:5, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit" }}>
            Clear
          </button>
        )}
      </div>

      {error && (
        <div style={{ fontSize:12, color:"#ef4444", background:"rgba(239,68,68,0.08)", borderRadius:8, padding:"10px 14px" }}>{error}</div>
      )}

      {/* Table */}
      <div style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.08)", borderRadius:10, overflow:"hidden" }}>
        {loading && <div style={{ padding:32, textAlign:"center", color:"#9ca3af", fontSize:13 }}>Loading history…</div>}
        {!loading && visible.length === 0 && (
          <div style={{ padding:32, textAlign:"center", color:"#9ca3af", fontSize:13 }}>
            {history.length === 0 ? "No change history recorded yet. Changes will appear here as the team uses PulseX." : "No entries match the current filters."}
          </div>
        )}
        {!loading && visible.length > 0 && visible.map((entry, i) => {
          const actionColor = actionColors[entry.action] || "#9ca3af";
          const isDelete    = entry.action === "delete" || entry.action.includes("delete");
          const isRevertable= (isDelete || (entry.action === "update" && entry.field)) && !entry.action.includes("(");
          const byPerson    = people.find(p => p.id === entry.byPersonId);

          return (
            <div key={entry.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 16px",
              borderBottom: i < visible.length-1 ? "1px solid rgba(0,0,0,0.05)" : "none",
              background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
              {/* Action badge */}
              <span style={{ fontSize:9, fontWeight:800, color:actionColor, background:`${actionColor}18`,
                borderRadius:4, padding:"3px 7px", whiteSpace:"nowrap", flexShrink:0, marginTop:2, textTransform:"uppercase" }}>
                {entry.action}
              </span>
              {/* Content */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#1f2937" }}>
                  {entry.entityTitle || entry.entityId}
                  {entry.field && <span style={{ fontWeight:400, color:"#6b7280" }}> · {entry.field}</span>}
                </div>
                {entry.projectName && <div style={{ fontSize:10, color:"#9ca3af", marginTop:1 }}>{entry.projectName}</div>}
                {entry.action === "update" && entry.field && (
                  <div style={{ fontSize:10, color:"#6b7280", marginTop:3, display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ background:"rgba(239,68,68,0.08)", color:"#ef4444", borderRadius:3, padding:"1px 5px" }}>
                      {JSON.stringify(entry.oldValue)?.slice(0,40)}
                    </span>
                    <span style={{ color:"#9ca3af" }}>→</span>
                    <span style={{ background:"rgba(52,211,153,0.08)", color:"#059669", borderRadius:3, padding:"1px 5px" }}>
                      {JSON.stringify(entry.newValue)?.slice(0,40)}
                    </span>
                  </div>
                )}
              </div>
              {/* Meta */}
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:10, color:"#6b7280" }}>{byPerson?.name || entry.byName || "—"}</div>
                <div style={{ fontSize:10, color:"#9ca3af", marginTop:1 }}>{fmt(entry.at)}</div>
              </div>
              {/* Restore button */}
              {isRevertable && (
                <button
                  onClick={() => setConfirmDel(entry)}
                  disabled={!!restoring}
                  style={{ fontSize:10, fontWeight:700, color:isDelete?"#34d399":"#38bdf8",
                    background:isDelete?"rgba(52,211,153,0.1)":"rgba(56,189,248,0.1)",
                    border:`1px solid ${isDelete?"rgba(52,211,153,0.3)":"rgba(56,189,248,0.3)"}`,
                    borderRadius:5, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit",
                    flexShrink:0, whiteSpace:"nowrap" }}>
                  {restoring === entry.id ? "…" : isDelete ? "↩ Restore" : "↩ Revert"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {confirmDel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:12, padding:"28px 32px", maxWidth:400, width:"90vw", boxShadow:"0 8px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ fontSize:15, fontWeight:800, color:"#1f2937", marginBottom:10 }}>
              {confirmDel.action === "delete" ? "Restore this item?" : "Revert this change?"}
            </div>
            <div style={{ fontSize:12, color:"#6b7280", marginBottom:20, lineHeight:1.6 }}>
              {confirmDel.action === "delete"
                ? `This will un-delete "${confirmDel.entityTitle || confirmDel.entityId}" and make it visible again.`
                : `This will revert the "${confirmDel.field}" field from "${JSON.stringify(confirmDel.newValue)}" back to "${JSON.stringify(confirmDel.oldValue)}".`}
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={()=>setConfirmDel(null)}
                style={{ fontSize:12, color:"#6b7280", background:"none", border:"1px solid rgba(0,0,0,0.12)", borderRadius:6, padding:"8px 16px", cursor:"pointer", fontFamily:"inherit" }}>
                Cancel
              </button>
              <button onClick={()=>{ handleRestore(confirmDel); setConfirmDel(null); }}
                style={{ fontSize:12, fontWeight:700, color:"#fff", background:"#34d399", border:"none", borderRadius:6, padding:"8px 18px", cursor:"pointer", fontFamily:"inherit" }}>
                {confirmDel.action === "delete" ? "Yes, Restore" : "Yes, Revert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default function App() {
  // ── SUPABASE CONFIG — read after main.jsx has set window vars ────────────
  // Reading inside App() guarantees main.jsx has already run and set these.
  const SB_URL   = (typeof window !== "undefined" && window.__SB_URL__)  || "";
  const SB_KEY   = (typeof window !== "undefined" && window.__SB_KEY__)  || "";
  const SB_READY = !!(SB_URL && SB_KEY);

  // Debug: log on every mount so you can confirm env vars are present
  useEffect(() => {
    
    
    // [SB_KEY configured]
    
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
          "Authorization": (() => {
            try {
              const s = JSON.parse(localStorage.getItem("sb_session") || "{}");
              return `Bearer ${s.access_token || SB_KEY}`;
            } catch { return `Bearer ${SB_KEY}`; }
          })(),
          "Content-Type":  "application/json",
          "Prefer":        prefer || "return=representation",
          ...(extraHeaders || {}),
        },
      });
      if (!res.ok) {
        const text = await res.text();
        // Never log raw HTTP response — may contain sensitive data
        try {
          const errBody = JSON.parse(text);
          const code = errBody?.code || "";
          const msg  = errBody?.message || errBody?.error_description || "";

          if (res.status === 401 || code === "PGRST303" || /jwt expired/i.test(msg)) {
            try { localStorage.removeItem("sb_session"); } catch {}
            window.__pulsex_session_expired__ = true;
            window.__pulsex_session_expired_flag__ = true;
            return { data: null, error: "session_expired" };
          }

          if (res.status === 403 || code === "42501") {
            console.warn("[PulseX] Permission denied:", path.split("?")[0]);
            return { data: null, error: "permission_denied" };
          }

          console.error("[PulseX] HTTP", res.status, path.split("?")[0]);
        } catch {}
        return { data: null, error: "request_failed" };
      }
      const text = await res.text();
      return { data: text ? JSON.parse(text) : null, error: null };
    } catch (e) {
      console.error("[PulseX] fetch threw:", e.message, "→", path.split("?")[0]);
      return { data: null, error: e.message };
    }
  }, [SB_URL, SB_KEY, SB_READY]); // re-creates if env vars change

  // ── sb convenience object — re-created when sbFetch updates ──────────────
  const sb = useMemo(() => ({
    select:      (table, query = "")     => sbFetch(query ? `${table}?${query}` : table),
    upsert:      (table, body)           => sbFetch(table, { method: "POST",   prefer: "resolution=merge-duplicates,return=minimal", body: JSON.stringify(Array.isArray(body) ? body : [body]) }),
    update:      (table, id, body)       => sbFetch(`${table}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH",  prefer: "return=minimal", body: JSON.stringify(body) }),
    updateWhere: (table, col, val, body) => sbFetch(`${table}?${col}=eq.${encodeURIComponent(val)}`, { method: "PATCH",  prefer: "return=minimal", body: JSON.stringify(body) }),
    delete:      (table, id)             => sbFetch(`${table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" }),
    deleteWhere: (table, col, val)       => sbFetch(`${table}?${col}=eq.${encodeURIComponent(val)}`, { method: "DELETE", prefer: "return=minimal" }),
    // Soft delete: set deleted_at / deleted_by via PATCH instead of DELETE
    softDelete:  (table, id, byPersonId) => sbFetch(`${table}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ deleted_at: new Date().toISOString(), deleted_by: byPersonId || "" }) }),
    restore:     (table, id, byPersonId) => sbFetch(`${table}?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ deleted_at: null, deleted_by: null, restored_at: new Date().toISOString(), restored_by: byPersonId || "" }) }),
  }), [sbFetch]);

  // ── UI-only state (never persisted) ───────────────────────────────────────
  // ── Auth — declared first so early returns are safe ─────────────────────────
  const [authSession, setAuthSession] = useState(() => {
    // If this is a recovery or invite flow, ALWAYS clear the stored session
    // so the user is shown the LoginScreen → SetPassword flow, not the app.
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      // PKCE flow (query string) or legacy hash flow — both require SetPassword screen
      const isAuthCallback = hash.includes("type=recovery") || hash.includes("type=invite")
        || hash.includes("type=signup") || search.includes("code=");
      if (isAuthCallback) {
        try { localStorage.removeItem("sb_session"); } catch {}
        return null;
      }
    }
    return getStoredSession();
  });
  const [authUser,    setAuthUser]    = useState(null);
  const [currentRole, setCurrentRole] = useState("member");
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  // Supabase v1 returns { user: { id } }, v2 may return { user_id } or decode from JWT
  const authUUID = authSession?.user?.id
    || authSession?.user_id
    || authSession?.sub
    || (() => {
         // Decode JWT payload without a library to get sub (user UUID)
         try {
           const token = authSession?.access_token;
           if (!token) return null;
           const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
           return payload.sub || null;
         } catch { return null; }
       })()
    || null;

  const handleLogin = async ({ session, user }) => {
    setAuthSession(session); setAuthUser(user);
    const appUser = await fetchAppUser(user.id, session.access_token);
    if (appUser) {
      setCurrentRole(appUser.role);
      setCurrentUser(appUser.teamMemberId);
      setOwnMemberId(appUser.teamMemberId);
      try { localStorage.setItem("planr_own_member_id", appUser.teamMemberId); } catch {}
    }
    setSessionExpired(false);
    setSessionExpired(false); setView("myhub"); setAuthLoading(false);
  };
  const handleLogout = async () => {
    console.log("[PulseX] handleLogout called");
    await signOut(authSession?.access_token || "");
    setAuthSession(null);
    setAuthUser(null);
    setCurrentRole("member");
    try { localStorage.removeItem("planr_view"); } catch {}
  };
  useEffect(() => {
    async function boot() {
      let session = getStoredSession();
      if (!session) { setAuthLoading(false); return; }

      // If the stored access token is expired but we have a refresh token, silently refresh
      const isExpired = session.expires_at && Date.now() / 1000 > session.expires_at;
      if (isExpired && session.refresh_token) {
        const refreshed = await refreshSession(session);
        if (refreshed) {
          session = refreshed;
        } else {
          // Refresh failed — clear session and show login
          try { localStorage.removeItem("sb_session"); } catch {}
          setAuthLoading(false);
          return;
        }
      }

      fetchAppUser(session.user?.id, session.access_token)
        .then(appUser => {
          if (appUser) {
            setCurrentRole(appUser.role);
            setCurrentUser(appUser.teamMemberId);
            setOwnMemberId(appUser.teamMemberId);
            try { localStorage.setItem("planr_own_member_id", appUser.teamMemberId); } catch {}
          }
          setAuthSession(session); setAuthUser(session.user); setAuthLoading(false);
        })
        .catch(() => {
          setAuthSession(session); setAuthUser(session.user); setAuthLoading(false);
        });
    }
    boot();
  }, []); // eslint-disable-line

  // Background token refresh — runs every 10 minutes, refreshes if expiry < 15 min away
  useEffect(() => {
    const interval = setInterval(async () => {
      const session = getStoredSession();
      if (!session?.refresh_token) return;
      const secsLeft = (session.expires_at || 0) - Date.now() / 1000;
      if (secsLeft < 900) { // refresh when less than 15 minutes remaining
        const refreshed = await refreshSession(session);
        if (refreshed) setAuthSession(refreshed);
      }
    }, 10 * 60 * 1000); // check every 10 minutes
    return () => clearInterval(interval);
  }, []);


  // Detect session expiry from sbFetch and show friendly message
  useEffect(() => {
    const t = setInterval(() => {
      if (window.__pulsex_session_expired_flag__) {
        window.__pulsex_session_expired_flag__ = false;
        setAuthSession(null); setAuthUser(null); setCurrentRole("member");
        setSessionExpired(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Watch for session expiry signal from sbFetch
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.__pulsex_session_expired_flag__) {
        window.__pulsex_session_expired_flag__ = false;
        setAuthSession(null);
        setAuthUser(null);
        setCurrentRole("member");
        setSessionExpired(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const [view, setViewRaw] = useState(() => {
    try { return localStorage.getItem("planr_view") || "myhub"; } catch { return "myhub"; }
  });
  const setView = (v) => {
    setViewRaw(v);
    try { localStorage.setItem("planr_view", v); } catch {}
  };
  const [editingItem, setEditingItem] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
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
  const [notifications, setNotifications] = useState([]);
  const [adminTasks, setAdminTasks] = useState([]); // tasks assigned by admin to team members
  const [toastNotif, setToastNotif] = useState(null); // { id, message, taskInfo }
  const [personalTasks, setPersonalTasks] = useState(typeof window !== "undefined" && !window.__SB_URL__ ? [
    { id:"pt_demo1", person_id:"", title:"Follow up on client feedback", status:"Not Started", priority:"Medium", due_date:new Date(Date.now()+86400000*3).toISOString().slice(0,10), notes:"", created_at:new Date().toISOString() },
    { id:"pt_demo2", person_id:"", title:"Update project tracker", status:"In Progress", priority:"High", due_date:new Date(Date.now()+86400000).toISOString().slice(0,10), notes:"", created_at:new Date().toISOString() },
  ] : []);
  const [currentUserId, setCurrentUserId] = useState(() => {
    try { return localStorage.getItem("planr_current_user") || ""; } catch { return ""; }
  });
  const setCurrentUser = (id) => {
    setCurrentUserId(id);
    try { localStorage.setItem("planr_current_user", id); } catch {}
  };
  // The logged-in user's OWN team member ID — never changes when admin switches hubs
  const [ownMemberId, setOwnMemberId] = useState(() => {
    try { return localStorage.getItem("planr_own_member_id") || ""; } catch { return ""; }
  });
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
  const [deliverableTemplates, setDeliverableTemplates] = useState([]);
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
        sb.select("projects",       "order=position.asc,created_at.asc"),
        sb.select("deliverables",   "deleted_at=is.null&order=position.asc,created_at.asc"),
        sb.select("subtasks",       "deleted_at=is.null&order=position.asc,created_at.asc"),
        sb.select("team_members",   "order=position.asc,created_at.asc"),
        sb.select("holidays",       "order=date.asc"),
        sb.select("status_notes",   ""),
        sb.select("templates",      "order=created_at.asc"),
        sb.select("pto",            "deleted_at=is.null&order=start_date.asc"),

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
      // Guard: skip subtask rows that have a deliverable_id pointing to a
      // non-existent deliverable (orphaned subtasks saved to wrong table)
      const deliverableIds = new Set((dR.data || []).map(d => d.id));
      const cleanSubtasks = (sR.data || []).filter(s => {
        if (s.deliverable_id == null) {
          console.warn("[PulseX] Orphan subtask (null deliverable_id):", s.id, s.title);
          return false;
        }
        if (!deliverableIds.has(s.deliverable_id)) {
          console.warn("[PulseX] Orphan subtask (missing deliverable):", s.id, s.title, "→", s.deliverable_id);
          return false;
        }
        return true;
      });
      setProjects(active.map(p => rowToProject(p, dR.data, cleanSubtasks)));
      setArchivedProjects(archived.map(p => rowToProject(p, dR.data, cleanSubtasks)));
      setPeople((mR.data || []).map(p => ({ id: p.id, name: p.name, color: p.color, annualTarget: p.annual_target || 1850, department: p.department || "" })));
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

  // Load personal tasks separately — needs authUser.id which isn't available during loadAll
  useEffect(() => {
    // [PT] load effect
    // [security] auth session structure log removed
    if (!SB_READY || !authUUID) return;
    // Load deliverable templates
    sb.select("deliverable_templates", "deleted_at=is.null&order=created_at.asc")
      .then(r => {
        if (!r?.error && r?.data) {
          // Load tasks for each template
          sb.select("deliverable_template_tasks", "order=template_id.asc,sort_order.asc")
            .then(tr => {
              const tasksByTemplate = {};
              (tr?.data || []).forEach(t => {
                if (!tasksByTemplate[t.template_id]) tasksByTemplate[t.template_id] = [];
                tasksByTemplate[t.template_id].push({
                  id: t.id, title: t.title || "", department: t.department || "",
                  effort: t.effort || "M", customHours: t.custom_effort_hours || null,
                  duration: t.default_duration || 1, notes: t.notes || "",
                  deps: t.dependency_template_task_ids || [],
                });
              });
              setDeliverableTemplates(r.data.map(tpl => ({
                id: tpl.id, name: tpl.name || "", title: tpl.title || "",
                department: tpl.department || "", notes: tpl.notes || "",
                duration: tpl.default_duration || 5, status: tpl.default_status || "Not Started",
                priority: tpl.default_priority || "Medium",
                tasks: tasksByTemplate[tpl.id] || [],
              })));
            }).catch(() => {});
        }
      }).catch(() => {});
    // Load admin-assigned tasks — graceful if table doesn't exist yet
    sb.select("admin_tasks", "order=created_at.desc")  // deleted_at filter added after SQL migration
      .then(r => {
        if (r?.error) {
          console.warn("[PulseX] admin_tasks not available — run the setup SQL:", r.error);
          return;
        }
        if (r?.data) {
          setAdminTasks(r.data.map(t => ({
            id: t.id, title: t.title || "", assignedTo: t.assigned_to,
            assignedBy: t.assigned_by || "", effort: t.effort || "M",
            customHours: t.custom_hours || null, status: t.status || "Not Started",
            dueDate: t.due_date || null, notes: t.notes || "", createdAt: t.created_at,
          })));
        }
      }).catch(() => {});
    sb.select("personal_tasks", `person_id=eq.${authUUID}&deleted_at=is.null&order=created_at.asc`)
      .then(result => {
        console.log("[PT] load result:", JSON.stringify(result).slice(0,200));
        if (!result?.error && result?.data) {
          setPersonalTasks(result.data.map(r => ({
            id:       r.id,
            personId: r.person_id,
            title:    r.title     || "",
            status:   r.status    || "Not Started",
            priority: r.priority  || "Medium",
            dueDate:  r.due_date  || null,
            notes:    r.notes     || "",
            createdAt:r.created_at,
          })));
        }
      })
      .catch(e => console.warn("[PulseX] personal_tasks load:", e.message));
  }, [SB_READY, authUUID, sb]);

  async function seedDefaults() {
    for (let i = 0; i < initialPeople.length; i++) {
      await sb.upsert("team_members", { id: initialPeople[i].id, name: initialPeople[i].name, color: initialPeople[i].color, position: i, annual_target: initialPeople[i].annualTarget || 1850, department: initialPeople[i].department || "" });
    }
    for (let pi = 0; pi < initialProjects.length; pi++) {
      const proj = initialProjects[pi];
      await sb.upsert("projects", { id: proj.id, name: proj.name, client: proj.client || "", color: proj.color, project_number: proj.projectNumber || "", archived: false, position: pi });
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

    // ── Log changes to change_history ────────────────────────────────────────
    const allItemsForLog = projects.flatMap(p => [...p.deliverables, ...p.deliverables.flatMap(d => d.subtasks)]);
    const prevItem = allItemsForLog.find(x => x.id === updated.id);
    if (prevItem) {
      const trackedFields = ["status", "title", "assignees", "effort", "start", "end", "department", "priority"];
      trackedFields.forEach(field => {
        const oldV = prevItem[field], newV = updated[field];
        if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
          const proj = projects.find(p => p.deliverables.some(d => d.id === updated.id || d.subtasks.some(s => s.id === updated.id)));
          logChange(updated.deliverableId || updated.isSubtask ? "subtask" : "deliverable",
            updated.id, "update", {
              projectId: updated.projectId || proj?.id,
              field, oldValue: oldV, newValue: newV,
            });
        }
      });
    }

    // ── Detect newly added assignees and fire notifications immediately ────────
    // Run synchronously before the optimistic call so it always fires, even in
    // environments where Supabase isn't configured (preview, offline, etc.)
    const allItems = projects.flatMap(p => [...p.deliverables, ...p.deliverables.flatMap(d => d.subtasks)]);
    const oldItem  = allItems.find(x => x.id === updated.id);
    const oldAssignees = oldItem?.assignees || [];
    const newAssignees = updated.assignees || [];
    const addedPersonIds = newAssignees.filter(id => !oldAssignees.includes(id));
    const proj = projects.find(p =>
      p.deliverables.some(d => d.id === updated.id || d.subtasks.some(s => s.id === updated.id))
    );

    if (addedPersonIds.length > 0) {
      for (const personId of addedPersonIds) {
        const person = people.find(p => p.id === personId);
        if (!person) continue;
        const notifId = "notif_" + Date.now() + "_" + personId;
        const msg = `${person.name} has been assigned to "${updated.title || oldItem?.title || "a task"}" in ${proj?.name || "a project"}`;
        const notif = {
          id: notifId, type: "task_assigned", message: msg,
          assignedToPersonId: personId, completedByPersonId: null,
          taskId: updated.id,
          isRead: false, reviewedAt: null, createdAt: new Date().toISOString(),
        };
        setNotifications(prev => [notif, ...prev]);
        setToastNotif({ ...notif });
        console.log("[PulseX] assignment notification fired →", person.name);
        // Persist to Supabase asynchronously (non-blocking)
        if (SB_READY) {
          sb.upsert("task_notifications", {
            id: notifId, task_id: updated.id, notification_type: "task_assigned",
            message: msg, assigned_to_person_id: personId,
            is_read: false, created_at: notif.createdAt,
          }).then(r => {
            if (r?.error) console.error("[PulseX] assignee notif save failed:", r.error);
          });
        }
      }
    }

    // Stub so the two call sites below still compile
    const fireAssigneeNotifications = () => {};
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


    // ── Workflow: "Task Ready to Start" notifications ──────────────────────────
    // Fire synchronously (before optimistic) so the notification appears
    // instantly, matching the behaviour of task_assigned notifications above.
    const prevStatus = oldItem?.status;
    const wasJustCompleted = updated.status === "Done" && prevStatus !== "Done";

    if (wasJustCompleted) {
      const nextProjs = doSave(projects); // post-completion tree
      const readyTasks = getReadyTasks(nextProjs, updated.id);
      const readyNotifs = buildReadyNotifications({
        readyTasks,
        people,
        completedByPersonId: authMemberId || currentUserId,
        notifications,
      });
      if (readyNotifs.length > 0) {
        console.log(`[PulseX] workflow — ${readyTasks.length} task(s) ready to start:`,
          readyTasks.map(t => t.title));
        setNotifications(prev => [...readyNotifs, ...prev]);
        setToastNotif({ ...readyNotifs[0] });
        if (SB_READY) {
          readyNotifs.forEach(n => {
            sb.upsert("task_notifications", {
              id: n.id, task_id: n.taskId, notification_type: "task_ready",
              message: n.message, assigned_to_person_id: n.assignedToPersonId,
              completed_by_person_id: n.completedByPersonId,
              project_id: n.projectId, deliverable_id: n.deliverableId,
              is_read: false, created_at: n.createdAt,
            }).then(r => { if (r?.error) console.error("[PulseX] ready notif save failed:", r.error); });
          });
        }
      }
    }

    optimistic(
      () => setProjects(ps => doSave(ps)),
      async () => {
        const newProjs = doSave(projects);
        const item = newProjs.flatMap(p => [...p.deliverables, ...p.deliverables.flatMap(d => d.subtasks)]).find(x => x.id === updated.id);
        if (!item) return null;
        // ── Determine true item type ──────────────────────────────────────────
        // Search ALL projects to find the item's true parent — never trust
        // only updated.projectId since it may be set from projId (a different field)
        let trueProjectId = updated.projectId;
        let trueParentDel = null;

        // First: search by deliverableId if provided
        if (updated.deliverableId) {
          for (const p of newProjs) {
            const d = p.deliverables.find(d => d.id === updated.deliverableId);
            if (d) { trueProjectId = p.id; trueParentDel = d; break; }
          }
        }

        // Second: find by ID — is this item a subtask of any deliverable?
        if (!trueParentDel) {
          for (const p of newProjs) {
            const d = p.deliverables.find(d => d.subtasks.some(s => s.id === updated.id));
            if (d) { trueProjectId = p.id; trueParentDel = d; break; }
          }
        }

        // Third: is it a top-level deliverable?
        const trueProj = newProjs.find(p => p.id === trueProjectId);
        const isDeliverable = !trueParentDel && trueProj?.deliverables.some(d => d.id === updated.id);

        // Save the directly-edited item
        let primaryError = null;
        if (trueParentDel) {
          const pos = trueParentDel.subtasks.findIndex(s => s.id === updated.id);
          console.log("[PulseX] saving as SUBTASK — del:", trueParentDel.id, "pos:", pos);
          const { error } = await sb.upsert("subtasks", subToRow(item, trueParentDel.id, trueProjectId, Math.max(0, pos)), { onConflict: "id" });
          primaryError = error;
        } else if (isDeliverable) {
          const pos = trueProj.deliverables.findIndex(d => d.id === updated.id);
          console.log("[PulseX] saving as DELIVERABLE — proj:", trueProjectId, "pos:", pos);
          const { error } = await sb.upsert("deliverables", delToRow(item, trueProjectId, Math.max(0, pos)), { onConflict: "id" });
          primaryError = error;
        } else {
          console.error("[PulseX] handleSaveItem: could not classify item", updated.id, "— skipping save");
          return null;
        }

        // Persist cascaded date changes to Supabase
        // cascadeDates shifts downstream items in-memory only — without saving them
        // the cascade is lost on next reload.
        if (!primaryError) {
          const beforeFlat = projects.flatMap(p => [
            ...p.deliverables.map(d => ({ id:d.id, start:d.start, end:d.end, isSub:false })),
            ...p.deliverables.flatMap(d => d.subtasks.map(s => ({ id:s.id, start:s.start, end:s.end, isSub:true })))
          ]);
          const afterFlat = newProjs.flatMap(p => [
            ...p.deliverables.map(d => ({ id:d.id, start:d.start, end:d.end, isSub:false })),
            ...p.deliverables.flatMap(d => d.subtasks.map(s => ({ id:s.id, start:s.start, end:s.end, isSub:true })))
          ]);
          const cascaded = afterFlat.filter(a => {
            if (a.id === updated.id) return false;
            const b = beforeFlat.find(x => x.id === a.id);
            return b && (b.start !== a.start || b.end !== a.end);
          });
          if (cascaded.length > 0) {
            console.log("[PulseX] cascade — persisting", cascaded.length, "downstream shifts");
            await Promise.all(cascaded.map(c =>
              sb.update(c.isSub ? "subtasks" : "deliverables", c.id,
                { start_date: c.start, end_date: c.end }).catch(() => {})
            ));
          }
        }
        return primaryError;
      }
    );
  };

  const handleAddProject = (proj) => optimistic(
    () => setProjects(ps => [...ps, { ...proj, deliverables: [] }]),
    async () => {
      const { error } = await sb.upsert("projects", { id: proj.id, name: proj.name, client: proj.client || "", color: proj.color, project_number: proj.projectNumber || "", archived: false, position: projects.length });
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

  const handleBackfillDepartments = () => {
    const updates = [];
    projects.forEach(proj => {
      proj.deliverables.forEach(del => {
        const items = del.subtasks.length ? del.subtasks : [del];
        items.forEach(item => {
          if (item.department) return;
          const first = (item.assignees || []).map(id => people.find(p => p.id === id)).find(p => p?.department);
          if (first) updates.push({ item, projId: proj.id, delId: del.id, dept: first.department });
        });
      });
    });
    if (!updates.length) { alert("No tasks to backfill — tasks either already have a department, or their assignees have no department set."); return; }
    if (!window.confirm(`Set department on ${updates.length} task${updates.length !== 1 ? "s" : ""} from their first assignees?`)) return;
    updates.forEach(({ item, projId, delId, dept }) =>
      handleSaveItem({ ...item, department: dept, projectId: projId, deliverableId: delId })
    );
    alert(`✓ Updated ${updates.length} task${updates.length !== 1 ? "s" : ""}.`);
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
        project_number:   proj.projectNumber || "",
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

  const saveDeliverableTemplate = async (tpl) => {
    // Upsert template record
    const tplRow = { id: tpl.id, name: tpl.name, title: tpl.title || null,
      department: tpl.department || null, notes: tpl.notes || null,
      default_duration: tpl.duration || 5, default_status: tpl.status || "Not Started",
      default_priority: tpl.priority || "Medium", updated_at: new Date().toISOString() };
    setDeliverableTemplates(prev => {
      const idx = prev.findIndex(t => t.id === tpl.id);
      return idx >= 0 ? prev.map(t => t.id === tpl.id ? tpl : t) : [...prev, tpl];
    });
    if (SB_READY) {
      await sb.upsert("deliverable_templates", tplRow);
      // Delete all existing tasks for this template then re-insert
      await sb.deleteWhere("deliverable_template_tasks", "template_id", tpl.id);
      for (let i = 0; i < (tpl.tasks||[]).length; i++) {
        const t = tpl.tasks[i];
        await sb.upsert("deliverable_template_tasks", {
          id: t.id, template_id: tpl.id, title: t.title, department: t.department || null,
          effort: t.effort || "M", custom_effort_hours: t.customHours || null,
          default_duration: t.duration || 1, notes: t.notes || null,
          sort_order: i, dependency_template_task_ids: t.deps || [],
          updated_at: new Date().toISOString(),
        });
      }
    }
  };

  const deleteDeliverableTemplate = async (id) => {
    setDeliverableTemplates(prev => prev.filter(t => t.id !== id));
    logChange("template", id, "delete", {});
    if (SB_READY) {
      // Soft delete the template; tasks remain but hidden
      await sb.softDelete("deliverable_templates", id, currentUserId);
    }
  };

  const duplicateDeliverableTemplate = async (tpl) => {
    const newId = "dt_" + Date.now();
    const dup = {
      ...JSON.parse(JSON.stringify(tpl)),
      id: newId,
      name: tpl.name + " (copy)",
      tasks: (tpl.tasks || []).map(t => ({
        ...t,
        id: "tt_" + Date.now() + "_" + Math.random().toString(36).slice(2,5),
      })),
    };
    await saveDeliverableTemplate(dup);
  };

  // ── Audit logger — fire-and-forget, never blocks UI ───────────────────────
  const logChange = (entityType, entityId, action, fields = {}) => {
    if (!SB_READY || !authUUID) return;
    sb.upsert("change_history", {
      id: crypto.randomUUID ? crypto.randomUUID() : ("ch_" + Date.now()),
      entity_type: entityType,
      entity_id: entityId,
      action,
      parent_project_id: fields.projectId || null,
      parent_deliverable_id: fields.deliverableId || null,
      field_name: fields.field || null,
      old_value: fields.oldValue != null ? JSON.stringify(fields.oldValue) : null,
      new_value: fields.newValue != null ? JSON.stringify(fields.newValue) : null,
      changed_by_auth_id: authUUID,
      changed_by_person_id: currentUserId || null,
      changed_at: new Date().toISOString(),
      metadata: fields.meta ? JSON.stringify(fields.meta) : null,
    }).catch(() => {}); // never block on audit failure
  };

  const saveAdminTask = async (task) => {
    const id = task.id || ("at_" + Date.now());
    const entry = { ...task, id };
    setAdminTasks(prev => {
      const idx = prev.findIndex(t => t.id === id);
      return idx >= 0 ? prev.map(t => t.id === id ? entry : t) : [entry, ...prev];
    });
    logChange("admin_task", id, task.id ? "update" : "create", {
      field: "assigned_to", newValue: entry.assignedTo,
    });
    if (SB_READY) {
      await sb.upsert("admin_tasks", {
        id, title: entry.title, assigned_to: entry.assignedTo,
        assigned_by: entry.assignedBy || currentUserId,
        effort: entry.effort || "M", custom_hours: entry.customHours || null,
        status: entry.status || "Not Started", due_date: entry.dueDate || null,
        notes: entry.notes || "", updated_at: new Date().toISOString(),
      });
    }
    // Notify — fire regardless of people lookup so toast always works
    {
      const assignee = people.find(p => p.id === entry.assignedTo);
      const assigneeName = assignee?.name || entry.assignedTo || "team member";
      const assigner = people.find(p => p.id === currentUserId)?.name || "Admin";
      const notifId = "notif_" + Date.now();
      const msg = `"${entry.title}" assigned to ${assigneeName} by ${assigner}`;
      const notif = { id:notifId, type:"task_assigned", message:msg, assignedToPersonId:entry.assignedTo,
        taskId:id, isRead:false, reviewedAt:null, createdAt:new Date().toISOString() };
      setNotifications(prev => [notif, ...prev]);
      setToastNotif({ id:notifId, message:msg, type:"task_assigned" });
      if (SB_READY) {
        const r = await sb.upsert("task_notifications", {
          id:notifId, task_id:id, notification_type:"task_assigned", message:msg,
          assigned_to_person_id:entry.assignedTo, is_read:false, created_at:notif.createdAt,
        });
        if (r?.error) console.error("[PulseX] notification save failed:", r.error);
      }
    }

  };

  const updateAdminTaskStatus = async (id, status) => {
    const task = adminTasks.find(t => t.id === id);
    setAdminTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (SB_READY) await sb.update("admin_tasks", id, { status, updated_at: new Date().toISOString() });
    // When marked Done, notify the assigner
    if (status === "Done" && task && task.status !== "Done") {
      const assignee = people.find(p => p.id === task.assignedTo);
      const assigner = people.find(p => p.id === task.assignedBy);
      if (assignee) {
        const notifId = "notif_done_" + Date.now();
        const msg = `${assignee.name} completed "${task.title}"`;
        const notif = { id:notifId, type:"task_completed", message:msg,
          completedByPersonId:task.assignedTo, isRead:false, createdAt:new Date().toISOString() };
        setNotifications(prev => [notif, ...prev]);
        setToastNotif({ id:notifId, message:msg, type:"task_completed" });
        if (SB_READY) await sb.upsert("task_notifications", {
          id:notifId, task_id:id, notification_type:"task_completed", message:msg,
          completed_by_person_id:task.assignedTo, is_read:false, created_at:notif.createdAt,
        });
      }
    }
  };

  const deleteAdminTask = async (id) => {
    setAdminTasks(prev => prev.filter(t => t.id !== id));
    logChange("admin_task", id, "delete", {});
    if (SB_READY) await sb.softDelete("admin_tasks", id, currentUserId);
  };

  // Auto-dismiss toast after 8s using useEffect (not in render)
  useEffect(() => {
    if (!toastNotif) return;
    const t = setTimeout(() => setToastNotif(null), 8000);
    return () => clearTimeout(t);
  }, [toastNotif]);

  const dismissNotification = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, reviewedAt: new Date().toISOString() } : n));
    setToastNotif(null);
    if (SB_READY) await sb.update("task_notifications", id, { is_read: true, reviewed_at: new Date().toISOString() });
  };

  const savePersonalTask = async (task) => {
    // [security] auth token log removed
    const id = task.id && task.id.startsWith("pt_") ? task.id : ("pt_" + Date.now());
    const entry = { ...task, id, personId: authUUID, updated_at: new Date().toISOString() };
    setPersonalTasks(prev => {
      const idx = prev.findIndex(t => t.id === id);
      return idx >= 0 ? prev.map(t => t.id === id ? entry : t) : [...prev, entry];
    });
    if (SB_READY && authUUID) {
      const result = await sb.upsert("personal_tasks", {
        id,
        person_id:  authUUID,
        title:      entry.title || "",
        status:     entry.status || "Not Started",
        priority:   entry.priority || "Medium",
        due_date:   entry.dueDate || null,
        notes:      entry.notes || "",
        updated_at: entry.updated_at,
      });
      console.log("[PT] upsert result:", JSON.stringify(result).slice(0,200));
      if (result?.error) console.error("[PulseX] savePersonalTask error:", result.error);
    } else {
          }
  };
  const deletePersonalTask = async (id) => {
    setPersonalTasks(prev => prev.filter(t => t.id !== id));
    if (SB_READY) {
      const result = await sb.softDelete("personal_tasks", id, authUUID);
      if (result?.error) console.error("[PulseX] deletePersonalTask error:", result.error);
    }
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
      const { error } = await sb.softDelete("pto", id, currentUserId);
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

  const handleDeleteDeliverableConfirmed = (projectId, deliverableId) => optimistic(
    () => setProjects(projs => projs.map(p => p.id !== projectId ? p : { ...p, deliverables: p.deliverables.filter(d => d.id !== deliverableId) })),
    async () => {
      logChange("deliverable", deliverableId, "delete", { projectId, newValue: { deliverableId } });
      const { error } = await sb.softDelete("deliverables", deliverableId, currentUserId);
      return error;
    }
  );
  const handleDeleteDeliverable = (projectId, deliverableId) => {
    const proj = projects.find(p => p.id === projectId);
    const del  = proj?.deliverables?.find(d => d.id === deliverableId);
    setConfirmDelete({ type: "deliverable", id: deliverableId, name: del?.title || deliverableId,
      action: () => handleDeleteDeliverableConfirmed(projectId, deliverableId) });
  };

  const handleDeleteSubtask = (projectId, deliverableId, subtaskId) => optimistic(
    () => setProjects(projs => projs.map(p => p.id !== projectId ? p : { ...p, deliverables: p.deliverables.map(d => d.id !== deliverableId ? d : { ...d, subtasks: d.subtasks.filter(s => s.id !== subtaskId) }) })),
    async () => {
      logChange("subtask", subtaskId, "delete", { projectId, deliverableId: deliverableId, newValue: { subtaskId } });
      const { error } = await sb.softDelete("subtasks", subtaskId, currentUserId);
      return error;
    }
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
    logChange("task", subtaskId || deliverableId, "status_change", {
      projectId, deliverableId, field: "status",
      oldValue: "In Progress", newValue: "Done",
    });
    const proj = projects.find(p => p.id === projectId);
    const del  = proj?.deliverables.find(d => d.id === deliverableId);

    const createNotification = async (taskTitle, delTitle, prevStatus) => {
      if (prevStatus === "Done") return; // already Done — no new notification
      const notifId = "notif_" + Date.now();
      const person  = people.find(p => p.id === currentUserId);
      const message = `${person?.name || "Someone"} completed "${taskTitle}" in ${proj?.name || "a project"}`;
      const notif   = {
        id: notifId, taskId: subtaskId || deliverableId, deliverableId,
        projectId, completedByPersonId: currentUserId,
        type: "task_completed", message, isRead: false,
        reviewedAt: null, createdAt: new Date().toISOString(),
      };
      setNotifications(prev => [notif, ...prev]);
      if (currentRole === "admin") {
        setToastNotif(notif); // admin sees their own completions too
      } else {
        setToastNotif(notif); // show toast for the person who completed it; admin will see on next load
      }
      if (SB_READY) {
        await sb.upsert("task_notifications", {
          id: notifId, task_id: notif.taskId, deliverable_id: deliverableId,
          project_id: projectId, completed_by_person_id: currentUserId,
          notification_type: "task_completed", message,
          is_read: false, reviewed_at: null, created_at: notif.createdAt,
        });
      }
    };

    if (subtaskId) {
      const sub  = del?.subtasks.find(s => s.id === subtaskId);
      const next = sub?.status === "Done" ? "In Progress" : "Done";
      const newProg = next === "Done" ? 100 : 0;
      if (next === "Done") createNotification(sub?.title || "Task", del?.title || "", sub?.status);
      optimistic(
        () => setProjects(ps => ps.map(p => p.id !== projectId ? p : { ...p, deliverables: p.deliverables.map(d => d.id !== deliverableId ? d : { ...d, subtasks: d.subtasks.map(s => s.id !== subtaskId ? s : { ...s, status: next, progress: newProg }) }) })),
        async () => { const { error } = await sb.update("subtasks", subtaskId, { status: next, progress: newProg }); return error; }
      );
    } else {
      const next    = del?.status === "Done" ? "In Progress" : "Done";
      const newProg = next === "Done" ? 100 : del?.progress ?? 0;
      if (next === "Done") createNotification(del?.title || "Deliverable", del?.title || "", del?.status);
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

  // ── KPI activity tracking ─────────────────────────────────────────────────
  // Records logins and page views to user_activity for the KPI Dashboard.
  // Fires once on auth success (login event) and on every tab change.
  const trackActivity = React.useCallback((eventType) => {
    if (!SB_READY || !ownMemberId) return;
    // Do NOT pass id — let Supabase generate a uuid via gen_random_uuid().
    // Passing a text string like "ua_p1_login_123" causes a 400 because id is uuid type.
    sb.upsert("user_activity", {
      person_id:   ownMemberId,
      event_type:  eventType,
      occurred_at: new Date().toISOString(),
    }).catch(() => {});
  }, [SB_READY, ownMemberId]);

  // Track login on initial load — once per browser session (sessionStorage flag prevents duplicates)
  React.useEffect(() => {
    if (SB_READY && ownMemberId) {
      const key = `planr_login_tracked_${ownMemberId}`;
      if (!sessionStorage.getItem(key)) {
        trackActivity("login");
        try { sessionStorage.setItem(key, "1"); } catch {}
      }
    }
  }, [SB_READY, ownMemberId]);

  // Track tab/view changes
  React.useEffect(() => {
    if (view) trackActivity(`view_${view}`);
  }, [view]);

  const navItems = [
    { id: "myhub",     label: "My Hub",    icon: "⊙" },
    { id: "dashboard", label: "Dashboard", icon: "◈" },
    { id: "timeline",  label: "Timeline",  icon: "▬" },
    { id: "people",    label: "By Person", icon: "◎" },
    { id: "status",    label: "Status",    icon: "◉" },
    { id: "workload",  label: "Workload",  icon: "▦" },
    { id: "reporting", label: "Reporting", icon: "◈" },
    ...(currentRole === "admin" ? [
      { id: "history", label: "History", icon: "⟳" },
      { id: "kpi",     label: "KPI",     icon: "◉" },
    ] : []),
  ];

  // Auth gate — must be in App() so setting authSession=null triggers re-render
  if (authLoading) return (
    <div style={{ minHeight:"100vh", background:"#002A4E", display:"flex", alignItems:"center",
      justifyContent:"center", color:"#50C0C0", fontFamily:"inherit", fontSize:14 }}>Loading…</div>
  );
  if (!authSession) return <LoginScreen onLogin={handleLogin} sessionExpired={sessionExpired} />;

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
        @media (max-width: 480px) { .nav-controls { display: none !important; } .nav-label { display: none !important; } }
        @media (max-width: 640px) { .nav-label { display: none !important; } }
        select option { background: #ffffff; color: #1a1d23; }
        [data-timeline-body] { cursor: default; }
        [data-timeline-body]:not(:has(input:focus)):not(:has(textarea:focus)) { cursor: grab; }
        [data-timeline-body][data-panning] { cursor: grabbing !important; }
        .add-btn:hover { opacity: 1 !important; }
      `}</style>

      {/* Nav */}
      <header style={{ borderBottom: `1px solid rgba(255,255,255,0.08)`, padding: "0 8px 0 10px", display: "flex", alignItems: "center", height: 62, flexShrink: 0, background: BRAND_NAVY, width: "100%", boxSizing: "border-box", overflow: "visible", gap: 6, position: "relative" }}>
        {/* Logo — compact, no wide margin */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }} title="PulseX">
          <div style={{ width: 28, height: 28, background: BRAND_TEAL, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: BRAND_NAVY, fontFamily: '"Roboto", Arial, sans-serif' }}>PX</span>
          </div>
        </div>
        {/* Nav tabs — get all remaining space, scroll horizontally */}
        <nav
          style={{ display: "flex", gap: 2, overflowX: "auto", overflowY: "visible", flex: 1, scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch", minWidth: 0 }}
          onWheel={e => { if (!e.shiftKey && Math.abs(e.deltaX) < Math.abs(e.deltaY)) { e.currentTarget.scrollLeft += e.deltaY; } }}
        >
          {navItems.map(n => {
            // Badge = unread notifications (all types) for this user
            // Admin sees all unread; members see only their own assignments
            // Badge: shows unread notifications FOR THE LOGGED-IN USER (ownMemberId)
            // Admin: all unread (completions to review + their own assignments)
            // Member: only their own assignment notifications
            const badgeNotifs = currentRole === "admin"
              ? notifications.filter(x => !x.isRead)
              : notifications.filter(x => !x.isRead && x.assignedToPersonId === ownMemberId);
            const unreadCount = n.id === "myhub" ? badgeNotifs.length : 0;
            return (
              <button key={n.id} onClick={() => setView(n.id)} title={n.label} style={{
                background: view === n.id ? BRAND_TEAL_L : "none",
                border: `1px solid ${view === n.id ? BRAND_TEAL + "50" : "rgba(255,255,255,0.1)"}`,
                color: view === n.id ? BRAND_TEAL : "rgba(255,255,255,0.65)",
                padding: "5px 8px", borderRadius: 5, cursor: "pointer", fontSize: 14,
                fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: 1, transition: "all 0.12s", flexShrink: 0,
                minWidth: 36,
              }}>
                <span style={{ fontSize:14, position:"relative" }}>
                  {n.icon}
                </span>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.04em", opacity: 0.8, whiteSpace: "nowrap" }}>{n.label}</span>
                {unreadCount > 0 && (
                  <span style={{
                    background:"#f97316", color:"#fff",
                    borderRadius:10, fontSize:10, fontWeight:900,
                    padding:"2px 6px", lineHeight:"16px",
                    minWidth:18, textAlign:"center",
                    display:"block", width:"fit-content", margin:"0 auto",
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        {/* Zoom + Settings — hidden on very small screens via CSS */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }} className="nav-controls">
          {/* ── ZOOM — compact select ── */}
          <select value={zoomId} onChange={e => setZoom(e.target.value)} title="Zoom level"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)", borderRadius: 5, padding: "4px 2px", fontSize: 10, cursor: "pointer", fontFamily: "inherit", width: 34 }}>
            {ZOOM_LEVELS.map(z => <option key={z.id} value={z.id} style={{ color: "#000" }}>{z.label[0]}</option>)}
          </select>

          {/* ── SETTINGS MENU ── */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowSettingsMenu(m => !m)} style={{
              display: "flex", alignItems: "center", gap: 5,
              background: showSettingsMenu ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)",
              borderRadius: 6, padding: "5px 13px", cursor: "pointer",
              fontSize: 14, fontWeight: 800, fontFamily: "inherit",
            }}>⚙</button>
            {showSettingsMenu && (
              <div style={{
                position: "fixed", right: 12, top: 58, zIndex: 1500,
                background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10,
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)", minWidth: 200, overflow: "hidden",
              }}>
                {[
                  { icon: "◎", label: "Team Members",   color: "#38bdf8", action: () => { setShowTeamSettings(true); setShowSettingsMenu(false); } },
                  { icon: "⊙", label: "Backfill Task Depts", color: "#a78bfa", action: () => { handleBackfillDepartments(); setShowSettingsMenu(false); } },
                  { icon: "◧", label: "Templates",       color: "#a78bfa", action: () => { setShowTemplates(true); setShowSettingsMenu(false); } },  // deliverable templates

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
          <button onClick={handleLogout} title="Sign Out"
            style={{ background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)",
              color:"#fca5a5", borderRadius:6, padding:"4px 10px", cursor:"pointer",
              fontSize:12, fontFamily:"inherit", fontWeight:700, flexShrink:0 }}>
            ⎋
          </button>
          {/* ── NEW PROJECT BUTTON ── */}
          <button onClick={() => setShowNewProject(true)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: BRAND_TEAL_L, border: `1px solid ${BRAND_TEAL}80`,
            color: BRAND_TEAL_D, borderRadius: 6, padding: "5px 13px", cursor: "pointer",
            fontSize: 14, fontWeight: 800, fontFamily: "inherit",
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
            currentUserId={currentUserId}
            onSetCurrentUser={(id) => {
              if (currentRole !== "admin") return;
              setCurrentUser(id);
            }}
            onEditItem={handleEditItem} onMarkDone={handleMarkDone} onSaveItem={handleSaveItem}
            savePto={savePto} deletePto={deletePto}
            personalTasks={personalTasks}
            onSavePersonalTask={savePersonalTask}
            onDeletePersonalTask={deletePersonalTask}
            currentRole={currentRole}
            authMemberId={ownMemberId}
            authUUID={authUUID}
            adminTasks={currentRole === "admin" ? adminTasks : adminTasks.filter(t => t.assignedTo === ownMemberId)}
            onSaveAdminTask={saveAdminTask}
            onUpdateAdminTaskStatus={updateAdminTaskStatus}
            onDeleteAdminTask={deleteAdminTask}
            notifications={notifications}
            onDismissNotification={dismissNotification}
            setToastNotif={setToastNotif}
            onOpenNotifTask={(notif) => {
              const proj = projects.find(p => p.id === notif.projectId);
              const del  = proj?.deliverables.find(d => d.id === notif.deliverableId);
              if (del) handleEditItem({ ...del, projectId: proj.id, projectName: proj.name, projectColor: proj.color });
            }}
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
          <WorkloadView projects={projects} people={people} onEditItem={handleEditItem} pto={pto} holidays={holidays} adminTasks={adminTasks} />
        )}
        {view === "history" && currentRole === "admin" && (
          <ChangeHistoryView
            people={people}
            projects={projects}
            currentUserId={currentUserId}
            sb={sb}
            SB_READY={SB_READY}
          />
        )}

        {view === "kpi" && currentRole === "admin" && (
          <KPIDashboardView
            projects={projects}
            people={people}
            notifications={notifications}
            adminTasks={adminTasks}
            sb={sb}
            SB_READY={SB_READY}
            authMemberId={ownMemberId}
          />
        )}

        {view === "reporting" && (
          <ReportingDashboardView
            projects={projects} people={people} holidays={holidays} pto={pto}
            adminTasks={adminTasks}
          />
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
        <TeamSettingsModal people={people} sbUrl={SB_URL} sbKey={SB_KEY} onClose={() => setShowTeamSettings(false)} onSave={async (newPeople) => {
            setPeople(newPeople);
            // Upsert all members
            for (let i = 0; i < newPeople.length; i++) {
              await sb.upsert("team_members", { id: newPeople[i].id, name: newPeople[i].name, color: newPeople[i].color, position: i, annual_target: newPeople[i].annualTarget || 1850, department: newPeople[i].department || "" });
            }
          }} />
      )}
      {showTemplates && (
        <DeliverableTemplateManager
          deliverableTemplates={deliverableTemplates}
          onClose={() => setShowTemplates(false)}
          onSave={saveDeliverableTemplate}
          onDelete={deleteDeliverableTemplate}
          onDuplicate={duplicateDeliverableTemplate}
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
          deliverableTemplates={deliverableTemplates}
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

      {/* ── Completion toast — auto-dismisses after 8s ── */}
      {/* ── Confirm Delete dialog ── */}
      {confirmDelete && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:12, padding:"28px 32px", maxWidth:400,
            width:"90vw", boxShadow:"0 8px 40px rgba(0,0,0,0.25)", fontFamily:"inherit" }}>
            <div style={{ fontSize:15, fontWeight:800, color:"#1f2937", marginBottom:8 }}>Delete {confirmDelete.type}?</div>
            <div style={{ fontSize:13, color:"#6b7280", marginBottom:20, lineHeight:1.6 }}>
              <strong>"{confirmDelete.name}"</strong> will be soft-deleted and hidden from the timeline.
              Admins can restore it from Change History.
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ fontSize:12, color:"#6b7280", background:"none", border:"1px solid rgba(0,0,0,0.12)", borderRadius:6, padding:"8px 16px", cursor:"pointer", fontFamily:"inherit" }}>
                Cancel
              </button>
              <button onClick={() => { confirmDelete.action(); setConfirmDelete(null); }}
                style={{ fontSize:12, fontWeight:700, color:"#fff", background:"#ef4444", border:"none", borderRadius:6, padding:"8px 18px", cursor:"pointer", fontFamily:"inherit" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toastNotif && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, maxWidth:360, width:"calc(100vw - 48px)",
          background:"#1e293b", color:"#f8fafc", borderRadius:12, padding:"14px 16px",
          boxShadow:"0 8px 32px rgba(0,0,0,0.35)", display:"flex", alignItems:"flex-start", gap:12 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:toastNotif.type==="task_assigned"?BRAND_TEAL:"#34d399", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>
            {toastNotif.type === "task_assigned" ? "◎" : "✓"}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#f8fafc", marginBottom:3 }}>
              {toastNotif.type === "task_assigned" ? "Task Assigned" : "Task Completed"}
            </div>
            <div style={{ fontSize:11, color:"rgba(248,250,252,0.7)", lineHeight:1.45 }}>{toastNotif.message}</div>
          </div>
          <button onClick={() => {
              // Only mark reviewed for completions — assignments stay unread in the assignee's center
              if (toastNotif.type === "task_completed") dismissNotification(toastNotif.id);
              setToastNotif(null);
            }}
            style={{ background:"none", border:"none", color:"rgba(248,250,252,0.5)", cursor:"pointer", fontSize:18, lineHeight:1, flexShrink:0, padding:"0 2px" }}>×</button>
        </div>
      )}




    </div>
  );
}