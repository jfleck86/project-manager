export function flattenTasks(projects) {
  return projects.flatMap(proj =>
    proj.deliverables.flatMap(del => [
      { ...del, projId: proj.id, projName: proj.name, projColor: proj.color },
      ...del.subtasks.map(s => ({ ...s, projId: proj.id, delId: del.id, deliverableId: del.id })),
    ])
  );
}

export function isDependencyClear(task, taskById) {
  if (!task.dependencies?.length) return true;
  return task.dependencies.every(depId => taskById[depId]?.status === "Done");
}

export function blockedBy(task, taskById) {
  return (task.dependencies || []).map(id => taskById[id]).filter(d => d && d.status !== "Done");
}

export function priorityScore(task, taskById, today) {
  let s = 0;
  const d = task.end ? Math.ceil((new Date(task.end + "T00:00:00") - today) / 86400000) : 999;
  if (d < 0)  s += 100;
  if (d <= 2) s += 50;
  if (d <= 7) s += 30;
  if (task.status === "In Progress") s += 20;
  if (task.priority === "Critical")  s += 25;
  if (task.priority === "High")      s += 15;
  if (isDependencyClear(task, taskById)) s += 10;
  return s;
}