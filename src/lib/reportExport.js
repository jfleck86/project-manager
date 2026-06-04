// src/lib/reportExport.js
// ── PulseX Report Export Engine ──────────────────────────────────────────────
// Handles data extraction and file generation for all 9 report types.
// Outputs: CSV (native), Excel (SheetJS), PDF (jsPDF + autotable).
//
// Install dependencies:  npm install xlsx jspdf jspdf-autotable
// ─────────────────────────────────────────────────────────────────────────────

// ── Constants ─────────────────────────────────────────────────────────────────
const EFFORT_HOURS = { S: 1, M: 4, L: 8 };
const effortHrs = (e, custom) => e === "C" ? (parseFloat(custom) || 0) : (EFFORT_HOURS[e] || 4);

const BRAND_NAVY = "#002A4E";
const BRAND_TEAL = "#50C0C0";

// ── Date helpers ──────────────────────────────────────────────────────────────
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtNow = () => new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function dateRangeBounds(rangeKey, customStart, customEnd) {
  const today = todayISO();
  switch (rangeKey) {
    case "7d":  return { start: today, end: addDays(today, 7),  label: "Next 7 days" };
    case "30d": return { start: today, end: addDays(today, 30), label: "Next 30 days" };
    case "60d": return { start: today, end: addDays(today, 60), label: "Next 60 days" };
    case "qtd": {
      const now = new Date();
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const qEnd   = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0);
      return { start: qStart.toISOString().slice(0,10), end: qEnd.toISOString().slice(0,10), label: "Current Quarter" };
    }
    case "ytd": {
      const yr = new Date().getFullYear();
      return { start: `${yr}-01-01`, end: `${yr}-12-31`, label: "Full Year" };
    }
    case "custom": return { start: customStart || today, end: customEnd || addDays(today, 30), label: `${fmt(customStart)} – ${fmt(customEnd)}` };
    default: return { start: today, end: addDays(today, 30), label: "Next 30 days" };
  }
}

// ── Health calculation (mirrors getTrackStatus in App) ────────────────────────
function deliverableHealth(del) {
  if (del.status === "Done") return "Complete";
  if (del.status === "Blocked") return "Blocked";
  const subs = del.subtasks || [];
  const today = todayISO();
  const overdue = subs.filter(s => s.status !== "Done" && s.end && s.end < today);
  const blocked = subs.filter(s => s.status === "Blocked");
  if (del.end && del.end < today && del.status !== "Done") return "Off Track";
  if (overdue.length >= 2) return "Off Track";
  if (overdue.length === 1 && blocked.length >= 1) return "Off Track";
  if (overdue.length === 1) return "At Risk";
  if (blocked.length >= 1) return "At Risk";
  return "On Track";
}

// ── Forecast calc ─────────────────────────────────────────────────────────────
function calcForecast(personId, projects, adminTasks) {
  const yr = new Date().getFullYear();
  const yearStart = `${yr}-01-01`, yearEnd = `${yr}-12-31`, today = todayISO();

  const projectTasks = projects.flatMap(p =>
    p.deliverables.flatMap(d =>
      (d.subtasks.length ? d.subtasks : [d]).map(t => ({
        ...t, hrs: effortHrs(t.effort, t.customHours), assignees: t.assignees || [],
      }))
    )
  ).filter(t => (t.assignees).includes(personId));

  const adminAssigned = (adminTasks || [])
    .filter(t => t.assignedTo === personId)
    .map(t => ({ ...t, hrs: effortHrs(t.effort, t.customHours), end: t.dueDate || today }));

  const allTasks = [...projectTasks, ...adminAssigned];

  const ytdDone = allTasks
    .filter(t => t.status === "Done" && t.end >= yearStart && t.end <= today)
    .reduce((s, t) => s + t.hrs, 0);
  const inProgressPartial = allTasks
    .filter(t => t.status === "In Progress" && t.end && t.end < today)
    .reduce((s, t) => s + t.hrs * 0.5, 0);
  const planned = allTasks
    .filter(t => t.status !== "Done" && t.end > today && t.end <= yearEnd)
    .reduce((s, t) => s + t.hrs, 0);

  return { completed: ytdDone + inProgressPartial, planned, forecasted: ytdDone + inProgressPartial + planned };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA EXTRACTORS — one per report type
// ═══════════════════════════════════════════════════════════════════════════════

export function extractPersonReport({ person, projects, pto, adminTasks, range }) {
  const { start, end, label } = range;
  const today = todayISO();

  const allTasks = projects.flatMap(p =>
    p.deliverables.flatMap(d =>
      (d.subtasks.length ? d.subtasks : [d]).map(t => ({
        ...t, projName: p.name, projColor: p.color, delTitle: d.title,
        hrs: effortHrs(t.effort, t.customHours),
      }))
    )
  );

  const myTasks = allTasks.filter(t => (t.assignees || []).includes(person.id));
  const active  = myTasks.filter(t => t.status !== "Done");
  const upcoming = active.filter(t => t.end && t.end >= today && t.end <= end);
  const overdue  = active.filter(t => t.end && t.end < today);
  const blocked  = active.filter(t => t.status === "Blocked");
  const recent   = myTasks.filter(t => t.status === "Done" && t.end && t.end >= addDays(today, -30) && t.end <= today);
  const myAdminTasks = (adminTasks || []).filter(t => t.assignedTo === person.id && t.status !== "Done");
  const forecast = calcForecast(person.id, projects, adminTasks);
  const myPto = (pto || []).filter(p => p.personId === person.id && p.end >= today).slice(0, 5);

  const activeProjects = [...new Set(myTasks.filter(t => t.status !== "Done").map(t => t.projName))];

  return {
    meta: { title: "Person Report", person: person.name, dateRange: label, generated: fmtNow() },
    summary: {
      activeProjects: activeProjects.length,
      activeTasks: active.length + myAdminTasks.length,
      overdueTasks: overdue.length,
      forecastedHrs: Math.round(forecast.forecasted),
      completedHrs: Math.round(forecast.completed),
      plannedHrs: Math.round(forecast.planned),
    },
    upcomingTasks: upcoming.slice(0, 20).map(t => ({
      Task: t.title, Project: t.projName, Deliverable: t.delTitle,
      Status: t.status, "Due Date": fmt(t.end), "Est. Hours": t.hrs,
    })),
    overdueTasks: overdue.map(t => ({
      Task: t.title, Project: t.projName, "Due Date": fmt(t.end),
      Status: t.status, "Days Overdue": Math.ceil((new Date(today) - new Date(t.end + "T00:00:00")) / 86400000),
    })),
    recentCompleted: recent.slice(0, 15).map(t => ({
      Task: t.title, Project: t.projName, "Completed": fmt(t.end), "Hours": t.hrs,
    })),
    assignedTasks: myAdminTasks.map(t => ({
      Task: t.title, "Due Date": fmt(t.dueDate), Status: t.status, "Est. Hours": effortHrs(t.effort, t.customHours),
    })),
    pto: myPto.map(p => ({ Start: fmt(p.start), End: fmt(p.end), Note: p.note || "" })),
  };
}

export function extractProjectReport({ project, range }) {
  const { label } = range;
  const today = todayISO();

  const deliverables = (project.deliverables || []).map(d => ({
    Deliverable: d.title,
    Status: d.status,
    Health: d.trackOverride || deliverableHealth(d),
    Department: d.department || "—",
    "Start Date": fmt(d.start),
    "Due Date": fmt(d.end),
    "Tasks Total": (d.subtasks || []).length,
    "Tasks Done": (d.subtasks || []).filter(s => s.status === "Done").length,
    "Est. Hours": (d.subtasks.length ? d.subtasks : [d]).reduce((s, t) => s + effortHrs(t.effort, t.customHours), 0),
  }));

  const tasks = (project.deliverables || []).flatMap(d =>
    (d.subtasks || []).map(s => ({
      Deliverable: d.title, Task: s.title, Status: s.status,
      Department: s.department || "—", "Due Date": fmt(s.end),
      "Est. Hours": effortHrs(s.effort, s.customHours),
      Assignees: (s.assignees || []).join(", "),
    }))
  );

  const atRisk = (project.deliverables || []).filter(d => {
    const h = deliverableHealth(d);
    return h === "At Risk" || h === "Off Track" || h === "Blocked";
  }).map(d => ({ Deliverable: d.title, Health: deliverableHealth(d), "Due Date": fmt(d.end), Status: d.status }));

  const health = {
    total: project.deliverables.length,
    onTrack: project.deliverables.filter(d => deliverableHealth(d) === "On Track").length,
    atRisk: project.deliverables.filter(d => deliverableHealth(d) === "At Risk").length,
    offTrack: project.deliverables.filter(d => deliverableHealth(d) === "Off Track").length,
    complete: project.deliverables.filter(d => deliverableHealth(d) === "Complete").length,
  };

  return {
    meta: { title: "Project Report", project: project.name, client: project.client || "—", dateRange: label, generated: fmtNow() },
    health,
    deliverables,
    tasks,
    atRisk,
  };
}

export function extractTeamReport({ people, projects, pto, adminTasks, range }) {
  const { label } = range;
  const today = todayISO();
  const in30 = addDays(today, 30);

  const rows = people.map(person => {
    const myTasks = projects.flatMap(p =>
      p.deliverables.flatMap(d =>
        (d.subtasks.length ? d.subtasks : [d]).filter(t => (t.assignees || []).includes(person.id))
          .map(t => ({ ...t, projName: p.name, hrs: effortHrs(t.effort, t.customHours) }))
      )
    );
    const forecast = calcForecast(person.id, projects, adminTasks);
    const active  = myTasks.filter(t => t.status !== "Done").length;
    const overdue = myTasks.filter(t => t.status !== "Done" && t.end && t.end < today).length;
    const due30   = myTasks.filter(t => t.status !== "Done" && t.end && t.end >= today && t.end <= in30).length;
    const myPto = (pto || []).filter(p => p.personId === person.id && p.end >= today && p.start <= in30);

    return {
      Person: person.name,
      "Active Tasks": active,
      "Due in 30 Days": due30,
      "Overdue": overdue,
      "Forecasted Hours": Math.round(forecast.forecasted),
      "Target Hours": person.annualTarget || 1850,
      "Forecast %": Math.round((forecast.forecasted / (person.annualTarget || 1850)) * 100) + "%",
      "Upcoming PTO": myPto.map(p => `${fmt(p.start)}–${fmt(p.end)}`).join("; ") || "None",
    };
  });

  return {
    meta: { title: "Team Report", dateRange: label, generated: fmtNow() },
    teamSummary: rows,
  };
}

export function extractDepartmentReport({ department, projects, people, range }) {
  const { label } = range;

  // People in this department (by their person.department field)
  const deptPeople = !department
    ? people
    : people.filter(p => p.department === department);
  const deptPeopleIds = new Set(deptPeople.map(p => p.id));

  // All tasks — include a task if:
  //   (a) its task.department matches the selected department, OR
  //   (b) at least one of its assignees belongs to the selected department
  // This way the report catches both task-typed work AND person-assigned work.
  const allTasks = projects.flatMap(p =>
    p.deliverables.flatMap(d =>
      (d.subtasks.length ? d.subtasks : [d]).map(t => ({
        ...t, projName: p.name, projId: p.id, delTitle: d.title,
        hrs: effortHrs(t.effort, t.customHours),
        taskDept: t.department || d.department || "",
      }))
    )
  );

  const deptTasks = !department
    ? allTasks
    : allTasks.filter(t =>
        t.taskDept === department ||
        (t.assignees || []).some(id => deptPeopleIds.has(id))
      );

  const active  = deptTasks.filter(t => t.status !== "Done");
  const overdue = active.filter(t => t.end && t.end < todayISO());

  // Per-person breakdown — only people in this department
  const byPerson = deptPeople.map(person => {
    const mine        = active.filter(t => (t.assignees || []).includes(person.id));
    const mineOverdue = mine.filter(t => t.end && t.end < todayISO());
    return {
      Person: person.name,
      "Person Department": person.department || "—",
      "Active Tasks": mine.length,
      "Est. Hours": mine.reduce((s, t) => s + t.hrs, 0),
      "Overdue": mineOverdue.length,
      "Projects": [...new Set(mine.map(t => t.projName))].join(", ") || "—",
    };
  }).filter(r => r["Active Tasks"] > 0 || deptPeople.length <= 5);
  // Always show dept members even if no active tasks (so the roster is visible)

  // Tasks by work type within this dept view
  const byWorkType = Object.entries(
    active.reduce((acc, t) => {
      const wt = t.taskDept || "Unassigned";
      acc[wt] = (acc[wt] || 0) + t.hrs;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])
   .map(([workType, hrs]) => ({
     "Work Type": workType,
     "Est. Hours": hrs,
     "Tasks": active.filter(t => (t.taskDept || "Unassigned") === workType).length,
   }));

  const upcomingDels = [
    ...active
      .filter(t => t.end && t.end >= todayISO())
      .sort((a, b) => (a.end > b.end ? 1 : -1))
      .reduce((map, t) => {
        if (!map.has(t.delTitle)) map.set(t.delTitle, { Deliverable: t.delTitle, Project: t.projName, "Due Date": fmt(t.end) });
        return map;
      }, new Map())
      .values()
  ].slice(0, 20);

  return {
    meta: {
      title: "Department Report",
      department: department || "All Departments",
      dateRange: label,
      generated: fmtNow(),
      note: department
        ? `Includes tasks assigned to ${deptPeople.length} ${department} team member${deptPeople.length !== 1 ? "s" : ""}, plus tasks with work type = ${department}.`
        : "Showing all departments.",
    },
    summary: {
      "Department": department || "All",
      "Team Members in Dept": deptPeople.length,
      "Active Tasks": active.length,
      "Overdue Tasks": overdue.length,
      "Total Est. Hours": active.reduce((s, t) => s + t.hrs, 0),
    },
    byPerson,
    byWorkType,
    upcomingDeliverables: upcomingDels,
  };
}

export function extractCapacityReport({ people, projects, adminTasks }) {
  const today = todayISO();
  const year = new Date().getFullYear();

  const rows = people.map(person => {
    const forecast = calcForecast(person.id, projects, adminTasks);
    const target = person.annualTarget || 1850;
    const pct = Math.round((forecast.forecasted / target) * 100);
    const label =
      pct > 110 ? "Above Forecast" :
      pct >= 95  ? "On Pace" :
      pct >= 75  ? "Below Forecast" : "Capacity Not Planned";

    return {
      Person: person.name,
      "Annual Target (hrs)": target,
      "Completed YTD (hrs)": Math.round(forecast.completed),
      "Planned Future (hrs)": Math.round(forecast.planned),
      "Forecasted Total (hrs)": Math.round(forecast.forecasted),
      "% of Target": pct + "%",
      Status: label,
    };
  });

  return {
    meta: { title: "Capacity Report", year, generated: fmtNow() },
    capacity: rows,
  };
}

export function extractHealthReport({ projects }) {
  const rows = projects.filter(p => !p.archived).map(p => {
    const dels = p.deliverables || [];
    const counts = { onTrack: 0, atRisk: 0, offTrack: 0, blocked: 0, complete: 0 };
    dels.forEach(d => {
      const h = (d.trackOverride && d.trackOverride !== "auto") ? d.trackOverride : deliverableHealth(d);
      if (h === "On Track")  counts.onTrack++;
      else if (h === "At Risk")   counts.atRisk++;
      else if (h === "Off Track") counts.offTrack++;
      else if (h === "Blocked")   counts.blocked++;
      else if (h === "Complete")  counts.complete++;
    });
    const worst = counts.offTrack > 0 ? "Off Track" : counts.blocked > 0 ? "Blocked" : counts.atRisk > 0 ? "At Risk" : "On Track";
    return {
      Project: p.name,
      Client: p.client || "—",
      "Overall Health": worst,
      "On Track": counts.onTrack,
      "At Risk": counts.atRisk,
      "Off Track": counts.offTrack,
      "Blocked": counts.blocked,
      "Complete": counts.complete,
      "Total Deliverables": dels.length,
      "Due Date": fmt(p.end),
    };
  });

  const atRiskDels = projects.flatMap(p =>
    (p.deliverables || [])
      .filter(d => ["At Risk","Off Track","Blocked"].includes(deliverableHealth(d)))
      .map(d => ({
        Project: p.name, Deliverable: d.title,
        Health: deliverableHealth(d), "Due Date": fmt(d.end), Status: d.status,
      }))
  );

  return {
    meta: { title: "Project Health Report", generated: fmtNow() },
    projectHealth: rows,
    atRiskDeliverables: atRiskDels,
  };
}

export function extractForecastReport({ people, projects, adminTasks }) {
  const year = new Date().getFullYear();

  const rows = people.map(person => {
    const forecast = calcForecast(person.id, projects, adminTasks);
    const target = person.annualTarget || 1850;
    const pct = Math.round((forecast.forecasted / target) * 100);
    const byProject = projects.map(p => {
      const hrs = p.deliverables.flatMap(d =>
        (d.subtasks.length ? d.subtasks : [d])
          .filter(t => (t.assignees||[]).includes(person.id) && t.status !== "Done")
          .map(t => effortHrs(t.effort, t.customHours))
      ).reduce((s,h) => s+h, 0);
      return hrs > 0 ? { project: p.name, hrs } : null;
    }).filter(Boolean);

    return {
      Person: person.name,
      "Target Hours": target,
      "Completed YTD": Math.round(forecast.completed),
      "Planned Hours": Math.round(forecast.planned),
      "Forecasted Total": Math.round(forecast.forecasted),
      "% of Target": pct + "%",
      Status: pct > 110 ? "Above Forecast" : pct >= 95 ? "On Pace" : pct >= 75 ? "Below Forecast" : "Capacity Not Planned",
      "Top Projects": byProject.slice(0,3).map(x => `${x.project} (${x.hrs}h)`).join("; "),
    };
  });

  return {
    meta: {
      title: "Forecasting Report",
      year,
      generated: fmtNow(),
      methodology: "Small = 1h · Medium = 4h · Large = 8h · Custom = entered value. Based on planned estimates, not actual time entry.",
    },
    forecasts: rows,
  };
}

export function extractAllData({ projects, people, pto, adminTasks, holidays }) {
  const today = todayISO();

  const projectRows = projects.map(p => ({
    ID: p.id, Name: p.name, Client: p.client || "—",
    "Start Date": fmt(p.start), "End Date": fmt(p.end),
    Deliverables: p.deliverables.length,
    Archived: p.archived ? "Yes" : "No",
  }));

  const deliverableRows = projects.flatMap(p =>
    (p.deliverables || []).map(d => ({
      Project: p.name, Deliverable: d.title, Status: d.status,
      Health: deliverableHealth(d), Department: d.department || "—",
      "Start Date": fmt(d.start), "Due Date": fmt(d.end),
    }))
  );

  const taskRows = projects.flatMap(p =>
    (p.deliverables || []).flatMap(d =>
      (d.subtasks || []).map(s => ({
        Project: p.name, Deliverable: d.title, Task: s.title,
        Status: s.status, Department: s.department || "—",
        Effort: s.effort, "Est. Hours": effortHrs(s.effort, s.customHours),
        "Due Date": fmt(s.end),
        Assignees: (s.assignees || []).join(", "),
      }))
    )
  );

  const capacityRows = people.map(person => {
    const forecast = calcForecast(person.id, projects, adminTasks);
    return {
      Person: person.name,
      "Annual Target": person.annualTarget || 1850,
      "Forecasted Hours": Math.round(forecast.forecasted),
      "% of Target": Math.round((forecast.forecasted / (person.annualTarget || 1850)) * 100) + "%",
    };
  });

  const ptoRows = (pto || []).map(p => ({
    Person: people.find(x => x.id === p.personId)?.name || p.personId,
    Start: fmt(p.start), End: fmt(p.end), Note: p.note || "",
  }));

  const healthRows = extractHealthReport({ projects }).projectHealth;

  return {
    meta: { title: "Full Data Export", generated: fmtNow() },
    tabs: {
      "Summary":     [{ "Generated": fmtNow(), "Projects": projects.length, "People": people.length }],
      "Projects":    projectRows,
      "Deliverables": deliverableRows,
      "Tasks":       taskRows,
      "Capacity":    capacityRows,
      "Forecasting": extractForecastReport({ people, projects, adminTasks }).forecasts,
      "Project Health": healthRows,
      "PTO":         ptoRows,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSV GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function rowsToCSV(rows) {
  if (!rows?.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.map(escape).join(","),
    ...rows.map(row => headers.map(h => escape(row[h] ?? "")).join(",")),
  ].join("\n");
}

function downloadCSV(filename, rows) {
  const blob = new Blob([rowsToCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename + ".csv"; a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL GENERATOR (SheetJS)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadXLSX() {
  if (window.XLSX) return window.XLSX;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => resolve(window.XLSX);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function downloadExcel(filename, tabs) {
  // tabs = { sheetName: rows[] }
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(tabs)) {
    if (!rows?.length) continue;
    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-width columns
    const cols = Object.keys(rows[0]);
    ws["!cols"] = cols.map(c => ({
      wch: Math.min(40, Math.max(c.length, ...rows.map(r => String(r[c] ?? "").length))),
    }));
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename + ".xlsx");
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF GENERATOR (jsPDF + autotable)
// ═══════════════════════════════════════════════════════════════════════════════

async function loadJsPDF() {
  if (window.jspdf) return window.jspdf.jsPDF;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.jspdf.jsPDF;
}

async function downloadPDF(filename, sections) {
  // sections = [{ title, subtitle?, rows, columns? }]
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let isFirst = true;

  for (const section of sections) {
    if (!section.rows?.length) continue;
    if (!isFirst) doc.addPage();
    isFirst = false;

    // Header bar
    doc.setFillColor(0, 42, 78); // BRAND_NAVY
    doc.rect(0, 0, W, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("PulseX", 10, 12);
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(section.title, W / 2, 12, { align: "center" });
    doc.setFontSize(8);
    doc.text(section.generated || fmtNow(), W - 10, 12, { align: "right" });

    // Subtitle / meta row
    if (section.subtitle) {
      doc.setTextColor(80, 192, 192); // BRAND_TEAL
      doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.text(section.subtitle, 10, 26);
    }

    // Table
    const cols = Object.keys(section.rows[0]);
    doc.autoTable({
      startY: section.subtitle ? 30 : 24,
      head: [cols],
      body: section.rows.map(row => cols.map(c => row[c] ?? "")),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 42, 78], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 248, 250] },
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        // Footer
        doc.setFontSize(7); doc.setTextColor(150);
        doc.text(
          `Generated by PulseX · ${fmtNow()} · Page ${data.pageNumber}`,
          W / 2, doc.internal.pageSize.getHeight() - 5, { align: "center" }
        );
        if (section.footer) {
          doc.text(section.footer, 10, doc.internal.pageSize.getHeight() - 5);
        }
      },
    });
  }

  doc.save(filename + ".pdf");
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateReport({ type, format, data, filters, onProgress }) {
  const { projects, people, pto, adminTasks, holidays } = data;
  const { personId, projectId, department, rangeKey, customStart, customEnd } = filters;
  const range = dateRangeBounds(rangeKey, customStart, customEnd);
  const person = people.find(p => p.id === personId);
  const project = projects.find(p => p.id === projectId);
  const ts = new Date().toISOString().slice(0, 10);

  onProgress?.("Extracting data…");

  let extracted, filename, pdfSections, excelTabs, csvRows;

  switch (type) {
    case "person": {
      if (!person) throw new Error("Select a team member");
      extracted = extractPersonReport({ person, projects, pto, adminTasks, range });
      filename = `PulseX_Person_${person.name.replace(/\s+/g,"_")}_${ts}`;
      pdfSections = [
        { title: "Person Report", subtitle: `${person.name} · ${range.label}`, generated: extracted.meta.generated, rows: [extracted.summary].map(s => ({
          "Active Projects": s.activeProjects, "Active Tasks": s.activeTasks,
          "Overdue Tasks": s.overdueTasks, "Forecasted Hours": s.forecastedHrs,
        }))},
        { title: "Upcoming Tasks", subtitle: `${person.name}`, generated: extracted.meta.generated, rows: extracted.upcomingTasks },
        { title: "Recently Completed", generated: extracted.meta.generated, rows: extracted.recentCompleted },
        { title: "Overdue Tasks", generated: extracted.meta.generated, rows: extracted.overdueTasks },
        { title: "Upcoming PTO", generated: extracted.meta.generated, rows: extracted.pto.length ? extracted.pto : [{ Info: "No upcoming PTO" }] },
      ];
      excelTabs = { "Summary": [extracted.summary], "Upcoming Tasks": extracted.upcomingTasks, "Overdue": extracted.overdueTasks, "Completed": extracted.recentCompleted, "Assigned Tasks": extracted.assignedTasks, "PTO": extracted.pto };
      csvRows = extracted.upcomingTasks;
      break;
    }

    case "project": {
      if (!project) throw new Error("Select a project");
      extracted = extractProjectReport({ project, range });
      filename = `PulseX_Project_${project.name.replace(/\s+/g,"_")}_${ts}`;
      pdfSections = [
        { title: "Project Report", subtitle: `${project.name} · ${project.client || ""}`, generated: extracted.meta.generated,
          rows: [{ "Total Deliverables": extracted.health.total, "On Track": extracted.health.onTrack, "At Risk": extracted.health.atRisk, "Off Track": extracted.health.offTrack, "Complete": extracted.health.complete }] },
        { title: "Deliverables", generated: extracted.meta.generated, rows: extracted.deliverables },
        { title: "At-Risk Items", generated: extracted.meta.generated, rows: extracted.atRisk.length ? extracted.atRisk : [{ Info: "No at-risk items" }] },
      ];
      excelTabs = { "Summary": [extracted.health], "Deliverables": extracted.deliverables, "Tasks": extracted.tasks, "At Risk": extracted.atRisk };
      csvRows = extracted.deliverables;
      break;
    }

    case "team": {
      extracted = extractTeamReport({ people, projects, pto, adminTasks, range });
      filename = `PulseX_Team_Report_${ts}`;
      pdfSections = [{ title: "Team Report", subtitle: range.label, generated: extracted.meta.generated, rows: extracted.teamSummary }];
      excelTabs = { "Team Summary": extracted.teamSummary };
      csvRows = extracted.teamSummary;
      break;
    }

    case "department": {
      extracted = extractDepartmentReport({ department, projects, people, range });
      filename = `PulseX_Dept_${(department||"All").replace(/\s+/g,"_")}_${ts}`;
      pdfSections = [
        { title: "Department Report", subtitle: `${extracted.meta.department} · ${range.label}`, generated: extracted.meta.generated,
          rows: [extracted.summary] },
        { title: "By Person", generated: extracted.meta.generated, rows: extracted.byPerson.length ? extracted.byPerson : [{ Info: "No active tasks for this department." }] },
        { title: "By Work Type", generated: extracted.meta.generated, rows: extracted.byWorkType },
        { title: "Upcoming Deliverables", generated: extracted.meta.generated, rows: extracted.upcomingDeliverables.length ? extracted.upcomingDeliverables : [{ Info: "None upcoming." }] },
      ];
      excelTabs = { "Summary": [extracted.summary], "By Person": extracted.byPerson, "By Work Type": extracted.byWorkType, "Deliverables": extracted.upcomingDeliverables };
      csvRows = extracted.byPerson;
      break;
    }

    case "capacity": {
      extracted = extractCapacityReport({ people, projects, adminTasks });
      filename = `PulseX_Capacity_${ts}`;
      pdfSections = [{ title: "Capacity Report", subtitle: String(extracted.meta.year), generated: extracted.meta.generated, rows: extracted.capacity }];
      excelTabs = { "Capacity": extracted.capacity };
      csvRows = extracted.capacity;
      break;
    }

    case "health": {
      extracted = extractHealthReport({ projects });
      filename = `PulseX_Health_${ts}`;
      pdfSections = [
        { title: "Project Health Report", generated: extracted.meta.generated, rows: extracted.projectHealth },
        { title: "At-Risk Deliverables", generated: extracted.meta.generated, rows: extracted.atRiskDeliverables.length ? extracted.atRiskDeliverables : [{ Info: "No at-risk items" }] },
      ];
      excelTabs = { "Project Health": extracted.projectHealth, "At-Risk Deliverables": extracted.atRiskDeliverables };
      csvRows = extracted.projectHealth;
      break;
    }

    case "forecast": {
      extracted = extractForecastReport({ people, projects, adminTasks });
      filename = `PulseX_Forecast_${ts}`;
      pdfSections = [{
        title: "Forecasting Report", subtitle: String(extracted.meta.year),
        generated: extracted.meta.generated, rows: extracted.forecasts,
        footer: extracted.meta.methodology,
      }];
      excelTabs = { "Forecasts": extracted.forecasts };
      csvRows = extracted.forecasts;
      break;
    }

    case "dashboard":
    case "all": {
      extracted = extractAllData({ projects, people, pto, adminTasks, holidays });
      filename = type === "all" ? `PulseX_Full_Export_${ts}` : `PulseX_Dashboard_${ts}`;
      excelTabs = extracted.tabs;
      pdfSections = Object.entries(extracted.tabs)
        .filter(([, rows]) => rows?.length)
        .map(([name, rows]) => ({ title: name, generated: extracted.meta.generated, rows }));
      csvRows = extracted.tabs["Projects"];
      break;
    }

    default:
      throw new Error("Unknown report type: " + type);
  }

  onProgress?.("Generating " + format.toUpperCase() + "…");

  if (format === "csv") {
    downloadCSV(filename, csvRows);
  } else if (format === "excel") {
    await downloadExcel(filename, excelTabs);
  } else if (format === "pdf") {
    await downloadPDF(filename, pdfSections);
  }

  onProgress?.("Done");
}