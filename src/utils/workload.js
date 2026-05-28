import { EFFORT_HOURS, WEEKLY_HOURS, HOURS_LIGHT, HOURS_MEDIUM } from "../constants/effort.js";
import { weekKey, isoWeekStart } from "./dates.js";

export const effortHours = (e) => EFFORT_HOURS[e] || EFFORT_HOURS["M"];

export function classifyLoad(hoursPlanned, hoursAvailable) {
  const pct = hoursAvailable > 0 ? hoursPlanned / hoursAvailable : hoursPlanned > 0 ? 2 : 0;

  if (hoursPlanned <= HOURS_LIGHT) return { label: "Light", color: "#34d399", pct };
  if (hoursPlanned <= HOURS_MEDIUM) return { label: "Moderate", color: "#fbbf24", pct };
  if (hoursPlanned <= hoursAvailable + 8) return { label: "Busy", color: "#fb923c", pct };

  return { label: "Heavy", color: "#f87171", pct };
}

export function ptoDaysInWeek(personId, weekStart, ptoList, holidaySet) {
  let days = 0;

  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart.getTime() + i * 86400000);
    const ds = d.toISOString().slice(0, 10);
    const isHoliday = holidaySet?.has?.(ds);

    if (!isHoliday && ptoList.some(p => p.personId === personId && ds >= p.start && ds <= p.end)) {
      days++;
    }
  }

  return days;
}

export function availableHours(personId, weekStartStr, ptoList, holidaySet) {
  const ws = new Date(weekStartStr + "T00:00:00");
  const ptoDays = ptoDaysInWeek(personId, ws, ptoList, holidaySet);

  let holidayDays = 0;

  for (let i = 0; i < 5; i++) {
    const d = new Date(ws.getTime() + i * 86400000);
    const ds = d.toISOString().slice(0, 10);

    if (holidaySet?.has?.(ds)) {
      holidayDays++;
    }
  }

  const offDays = Math.min(5, ptoDays + holidayDays);
  return Math.max(0, WEEKLY_HOURS - offDays * 8);
}

export function buildWeekMap(tasks) {
  const weekMap = {};

  tasks.forEach(task => {
    if (!task.start || !task.end) return;

    const assignees = task.assignees?.length ? task.assignees : ["_unassigned"];
    const start = new Date(task.start + "T00:00:00");
    const end = new Date(task.end + "T00:00:00");
    const weeks = [];

    let cur = new Date(isoWeekStart(start));

    while (cur <= end) {
      weeks.push(weekKey(cur));
      cur = new Date(cur.getTime() + 7 * 86400000);
    }

    const hrsTotal = EFFORT_HOURS[task.effort] || EFFORT_HOURS["M"];
    const hrsPerWeek = hrsTotal / Math.max(1, weeks.length);

    weeks.forEach(wk => {
      if (!weekMap[wk]) weekMap[wk] = {};

      assignees.forEach(pid => {
        if (!weekMap[wk][pid]) {
          weekMap[wk][pid] = { hrs: 0, tasks: [] };
        }

        weekMap[wk][pid].hrs += hrsPerWeek;
        weekMap[wk][pid].tasks.push(task);
      });
    });
  });

  return weekMap;
}