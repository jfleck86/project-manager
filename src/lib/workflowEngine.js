/**
 * workflowEngine.js — Centralized Workflow Notification Engine
 *
 * Pure functions — no React state, no API calls.
 * All side effects (setNotifications, Supabase writes) are handled by the caller.
 *
 * Notification philosophy: notify when action is needed, not when data changes.
 *
 * Supported triggers:
 *   task_ready   — a task's predecessor(s) just completed ("It's your turn to start")
 *   due_soon     — task due within 3 days, not complete, not yet notified
 *   overdue      — task past due date, not complete, not yet notified
 */

/**
 * Flatten all deliverables and subtasks across all projects with context.
 */
export function flattenItems(projects) {
  const items = [];
  for (const p of (projects || [])) {
    for (const d of (p.deliverables || [])) {
      items.push({
        ...d,
        _projId:         p.id,
        _projName:       p.name,
        _projColor:      p.color,
        _isSubtask:      false,
        _parentDelId:    null,
        _parentDelTitle: null,
      });
      for (const s of (d.subtasks || [])) {
        items.push({
          ...s,
          _projId:         p.id,
          _projName:       p.name,
          _projColor:      p.color,
          _isSubtask:      true,
          _parentDelId:    d.id,
          _parentDelTitle: d.title,
        });
      }
    }
  }
  return items;
}

/**
 * Check if a notification of a given type was already sent for a task.
 * Prevents duplicate notifications.
 */
export function hasSentNotif(taskId, type, notifications) {
  return (notifications || []).some(n => n.type === type && n.taskId === taskId);
}

/** Backwards compat alias */
export function hasPendingReadyNotif(taskId, notifications) {
  return hasSentNotif(taskId, 'task_ready', notifications);
}

/**
 * Return tasks that just became unblocked because completedItemId was marked Done.
 * A task is ready when all its dependencies are Done, or it is the next in sequence.
 */
export function getReadyTasks(projects, completedItemId) {
  const allItems = flattenItems(projects);
  const completedItem = allItems.find(x => x.id === completedItemId);
  if (!completedItem) return [];

  const candidates = [];
  const seen = new Set();

  // Strategy 1: explicit dependency graph
  for (const item of allItems) {
    if (item.id === completedItemId) continue;
    if (item.status !== 'Not Started') continue;
    const deps = item.dependencies || [];
    if (!deps.includes(completedItemId)) continue;
    const allReady = deps.every(depId => {
      const dep = allItems.find(x => x.id === depId);
      return dep?.status === 'Done';
    });
    if (allReady && !seen.has(item.id)) {
      candidates.push(item);
      seen.add(item.id);
    }
  }

  // Strategy 2: sequential fallback (no explicit deps)
  if (completedItem._isSubtask && completedItem._parentDelId) {
    for (const p of (projects || [])) {
      const parentDel = p.deliverables.find(d => d.id === completedItem._parentDelId);
      if (!parentDel) continue;
      const subtasks = parentDel.subtasks || [];
      const idx = subtasks.findIndex(s => s.id === completedItemId);
      if (idx < 0 || idx + 1 >= subtasks.length) continue;
      const next = subtasks[idx + 1];
      if (!(next.dependencies || []).length && !seen.has(next.id) && next.status === 'Not Started') {
        candidates.push({ ...next, _projId: p.id, _projName: p.name, _projColor: p.color,
          _isSubtask: true, _parentDelId: parentDel.id, _parentDelTitle: parentDel.title });
        seen.add(next.id);
      }
      break;
    }
  }

  return candidates.filter(t => (t.assignees || []).length > 0);
}

/**
 * Build "It's your turn to start" notifications for newly-unblocked tasks.
 * One notification per assignee per task. Deduped against existing notifications.
 */
export function buildReadyNotifications({ readyTasks, people, completedByPersonId, notifications }) {
  const results = [];
  for (const task of readyTasks) {
    if (hasSentNotif(task.id, 'task_ready', notifications)) continue;
    for (const personId of (task.assignees || [])) {
      const person = (people || []).find(p => p.id === personId);
      if (!person) continue;
      const notifId = `notif_ready_${task.id}_${personId}_${Date.now()}`;
      const duePart = task.end
        ? ` · Due ${new Date(task.end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : '';
      results.push({
        id:                  notifId,
        type:                'task_ready',
        message:             `It's your turn to start "${task.title || 'a task'}"${duePart}`,
        assignedToPersonId:  personId,
        completedByPersonId: completedByPersonId || null,
        taskId:              task.id,
        projectId:           task._projId       || null,
        deliverableId:       task._parentDelId  || null,
        isRead:              false,
        reviewedAt:          null,
        createdAt:           new Date().toISOString(),
        _taskTitle:          task.title,
        _projName:           task._projName,
        _projColor:          task._projColor,
        _isSubtask:          task._isSubtask,
        _dueDate:            task.end || null,
      });
    }
  }
  return results;
}

/**
 * Find tasks due within the next dueDays days that haven't had a due_soon notif sent.
 *
 * @param {Array}  projects
 * @param {Array}  notifications  — current loaded notifications
 * @param {string} todayStr       — YYYY-MM-DD
 * @param {number} dueDays        — default 3
 */
export function getDueSoonTasks(projects, notifications, todayStr, dueDays = 3) {
  const allItems = flattenItems(projects);
  const today = new Date(todayStr + 'T00:00:00');
  const cutoff = new Date(today.getTime() + dueDays * 86400000);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return allItems.filter(t =>
    t.status !== 'Done' &&
    t.status !== 'Cancelled' &&
    t.end &&
    t.end >= todayStr &&
    t.end <= cutoffStr &&
    (t.assignees || []).length > 0 &&
    !hasSentNotif(t.id, 'due_soon', notifications)
  );
}

/**
 * Find tasks that are overdue (past due date, not done) with no overdue notif yet.
 */
export function getOverdueTasks(projects, notifications, todayStr) {
  const allItems = flattenItems(projects);
  return allItems.filter(t =>
    t.status !== 'Done' &&
    t.status !== 'Cancelled' &&
    t.end &&
    t.end < todayStr &&
    (t.assignees || []).length > 0 &&
    !hasSentNotif(t.id, 'overdue', notifications)
  );
}

/**
 * Build due-soon notification objects. One per assignee per task.
 */
export function buildDueSoonNotifications({ tasks, people, notifications }) {
  const results = [];
  for (const task of tasks) {
    if (hasSentNotif(task.id, 'due_soon', notifications)) continue;
    const dueDate = task.end
      ? new Date(task.end + 'T00:00:00').toLocaleDateString('en-US',
          { weekday: 'long', month: 'short', day: 'numeric' })
      : 'soon';
    for (const personId of (task.assignees || [])) {
      const person = (people || []).find(p => p.id === personId);
      if (!person) continue;
      const notifId = `notif_soon_${task.id}_${personId}_${Date.now()}`;
      results.push({
        id:                  notifId,
        type:                'due_soon',
        message:             `"${task.title}" is due ${dueDate}`,
        assignedToPersonId:  personId,
        completedByPersonId: null,
        taskId:              task.id,
        projectId:           task._projId      || null,
        deliverableId:       task._parentDelId || null,
        isRead:              false,
        reviewedAt:          null,
        createdAt:           new Date().toISOString(),
        _taskTitle:          task.title,
        _projName:           task._projName,
        _projColor:          task._projColor,
        _dueDate:            task.end || null,
      });
    }
  }
  return results;
}

/**
 * Build overdue notification objects. One per assignee per task.
 */
export function buildOverdueNotifications({ tasks, people, notifications }) {
  const results = [];
  for (const task of tasks) {
    if (hasSentNotif(task.id, 'overdue', notifications)) continue;
    for (const personId of (task.assignees || [])) {
      const person = (people || []).find(p => p.id === personId);
      if (!person) continue;
      const notifId = `notif_overdue_${task.id}_${personId}_${Date.now()}`;
      results.push({
        id:                  notifId,
        type:                'overdue',
        message:             `"${task.title}" is now overdue`,
        assignedToPersonId:  personId,
        completedByPersonId: null,
        taskId:              task.id,
        projectId:           task._projId      || null,
        deliverableId:       task._parentDelId || null,
        isRead:              false,
        reviewedAt:          null,
        createdAt:           new Date().toISOString(),
        _taskTitle:          task.title,
        _projName:           task._projName,
        _projColor:          task._projColor,
        _dueDate:            task.end || null,
      });
    }
  }
  return results;
}