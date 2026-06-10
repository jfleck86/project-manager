// DB row ↔ app object converters — all schema mapping in one place

export function rowToSubtask(r) {
  return {
    id: r.id, title: r.title, status: r.status, priority: r.priority,
    department: r.department || "", start: r.start_date || "", end: r.end_date || "",
    progress: r.progress ?? 0, dependencies: r.dependencies ?? [], assignees: r.assignees ?? [],
    effort: r.effort || "M",
    file_url: r.file_url || "",
    isWaiting: r.is_waiting ?? false,
  };
}
export function rowToDeliverable(r, subs) {
  return {
    id: r.id, title: r.title, status: r.status, priority: r.priority,
    department: r.department || "", start: r.start_date || "", end: r.end_date || "",
    progress: r.progress ?? 0, dependencies: r.dependencies ?? [], assignees: r.assignees ?? [],
    trackOverride: r.track_override || null,
    effort: r.effort || "M",
    file_url: r.file_url || "",
    isWaiting: r.is_waiting ?? false,
    requestedDeliveryDate: r.requested_delivery_date || null,
    subtasks: (subs || []).filter(s => s.deliverable_id != null && s.deliverable_id === r.id)
      .sort((a, b) => a.position - b.position).map(rowToSubtask),
  };
}
export function rowToProject(r, dels, subs) {
  return {
    id: r.id, name: r.name, client: r.client || "", color: r.color,
    projectNumber: r.project_number || "",
    archived: r.archived, archivedAt: r.archived_at || null,
    ownerId: r.owner_id || null,
    teamMemberIds: r.team_member_ids || [],
    notes: r.notes || "",
    meta: r.meta || {},
    // Phase 1 initiation fields
    priority: r.priority || "Medium",
    accountLeadId: r.account_lead_id || null,
    projectManagerId: r.project_manager_id || null,
    objective: r.objective || "",
    earliestLaunchDate: r.earliest_launch_date || null,
    projectStatus: r.project_status || "Active",
    deliverables: (dels || []).filter(d => d.project_id === r.id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(d => rowToDeliverable(d, subs)),
  };
}
export function delToRow(d, projectId, pos = 0) {
  return {
    id: d.id, project_id: projectId, title: d.title, status: d.status, priority: d.priority,
    department: d.department || null, start_date: d.start || null, end_date: d.end || null,
    progress: d.progress ?? 0, dependencies: d.dependencies ?? [], assignees: d.assignees ?? [],
    track_override: d.trackOverride || null, effort: d.effort || "M",
    file_url: d.file_url || null, position: pos,
    is_waiting: d.isWaiting ?? false,
    requested_delivery_date: d.requestedDeliveryDate || null,
  };
}
export function subToRow(s, delId, projId, pos = 0) {
  return {
    id: s.id, deliverable_id: delId, project_id: projId, title: s.title,
    status: s.status, priority: s.priority, department: s.department || null,
    start_date: s.start || null, end_date: s.end || null,
    progress: s.progress ?? 0, dependencies: s.dependencies ?? [], assignees: s.assignees ?? [],
    effort: s.effort || "M", file_url: s.file_url || null, position: pos,
    is_waiting: s.isWaiting ?? false,
  };
}

export function ptoToRow(p) {
  return {
    id: p.id, person_id: p.personId, start_date: p.start,
    end_date: p.end, note: p.note || "",
  };
}
export function rowToPto(r) {
  return { id: r.id, personId: r.person_id, start: r.start_date, end: r.end_date, note: r.note || "" };
}

// ── PTO HELPERS ──────────────────────────────────────────────────────────────
export function isOnPto(personId, dateStr, ptoList) {
  return ptoList.some(p => p.personId === personId && dateStr >= p.start && dateStr <= p.end);
}
export function ptoOverlap(personId, startStr, endStr, ptoList) {
  return ptoList.filter(p => p.personId === personId && p.start <= endStr && p.end >= startStr);
}