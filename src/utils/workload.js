import { EFFORT_HOURS, WEEKLY_HOURS } from "../constants/effort.js";
import { isoWeekStart, weekKey } from "./dates.js";

export const effortHours = (e) => EFFORT_HOURS[e] || EFFORT_HOURS["M"];

// ── Workload thresholds — percentage of available hours ──────────────────────
// All bands scale with the person's actual availability (PTO + holidays reduce it)
// On a full 40h week: Light ≤20h · Moderate 21-44h · Busy 45-52h · Heavy 53h+
const PCT_LIGHT    = 0.50;   // ≤ 50%  of available
const PCT_MODERATE = 1.10;   // ≤ 110% of available
const PCT_BUSY     = 1.30;   // ≤ 130% of available  (above = Heavy)

export function classifyLoad(hoursPlanned, hoursAvailable) {
  const pct = hoursAvailable > 0
    ? hoursPlanned / hoursAvailable
    : hoursPlanned > 0 ? 2 : 0;
  if (pct <= PCT_LIGHT)    return { label: "Light",    color: "#34d399", pct };
  if (pct <= PCT_MODERATE) return { label: "Moderate", color: "#fbbf24", pct };
  if (pct <= PCT_BUSY)     return { label: "Busy",     color: "#fb923c", pct };
  return                          { label: "Heavy",    color: "#f87171", pct };
}

export function ptoDaysInWeek(personId, weekStart, ptoList, holidaySet) {
  let days = 0;
  for (let i = 0; i < 5; i++) {
    const d  = new Date(weekStart.getTime() + i * 86400000);
    const ds = d.toISOString().slice(0, 10);
    const ptoEntry = ptoList.find(p => p.personId === personId && ds >= p.start && ds <= p.end);
    if (ptoEntry) {
      const halfDays = ptoEntry.halfDayDates || [];
      days += halfDays.includes(ds) ? 0.5 : 1;
    }
    if (holidaySet && holidaySet.has(ds)) days++;
  }
  return Math.min(5, days);
}

export function availableHours(personId, weekStartStr, ptoList, holidaySet) {
  const ws      = new Date(weekStartStr + "T00:00:00");
  const offDays = ptoDaysInWeek(personId, ws, ptoList, holidaySet || new Set());
  return Math.max(0, WEEKLY_HOURS - offDays * 8);
}

export function buildWeekMap(tasks) {
  const weekMap = {};
  tasks.forEach(task => {
    if (!task.start || !task.end) return;
    const assignees  = task.assignees?.length ? task.assignees : ["_unassigned"];
    const start      = new Date(task.start + "T00:00:00");
    const end        = new Date(task.end   + "T00:00:00");
    const weeks      = [];
    let cur          = new Date(isoWeekStart(start));
    while (cur <= end) {
      weeks.push(weekKey(cur));
      cur = new Date(cur.getTime() + 7 * 86400000);
    }
    const hrsTotal   = EFFORT_HOURS[task.effort] || EFFORT_HOURS["M"];
    const hrsPerWeek = hrsTotal / Math.max(1, weeks.length);
    weeks.forEach(wk => {
      if (!weekMap[wk]) weekMap[wk] = {};
      assignees.forEach(pid => {
        if (!weekMap[wk][pid]) weekMap[wk][pid] = { hrs: 0, tasks: [] };
        weekMap[wk][pid].hrs += hrsPerWeek;
        weekMap[wk][pid].tasks.push(task);
      });
    });
  });
  return weekMap;
}