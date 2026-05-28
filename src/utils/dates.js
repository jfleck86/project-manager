import { TIMELINE_START } from "../constants/timeline.js";

export const parseDate = (s) => new Date(s + "T00:00:00");
export const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const fmtFull = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const fmtMonth = (d) => d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
export const durDays = (start, end) => Math.ceil((parseDate(end) - parseDate(start)) / 86400000) + 1;
export const todayLocal = () => new Date().toLocaleDateString("en-CA");
export const dayOffset = (dateStr) => Math.ceil((new Date(dateStr + "T00:00:00") - TIMELINE_START) / 86400000);

export function busyDays(start, end, holidaySet = new Set()) {
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


export function addWorkingDays(dateStr, days, holidayDates) {
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


export function isoWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  d.setDate(diff); d.setHours(0,0,0,0); return d;
}
export function weekKey(date) {
  const d = isoWeekStart(date);
  return d.toISOString().slice(0, 10);
}
export function weekLabel(key) {
  const d = new Date(key + "T00:00:00");
  return "W/O " + d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
}