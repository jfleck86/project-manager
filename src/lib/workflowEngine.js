/**
 * workflowEngine.js — Centralized Workflow Notification Engine
 *
 * Pure functions — no React state, no API calls.
 * All side effects (setNotifications, Supabase writes) are handled by the caller.
 *
 * Currently supported triggers:
 *   task_ready       — a task's predecessor(s) just completed
 *
 * Designed for future extension:
 *   deliverable_ready, proof_ready, review_required, approval_required
 */

// ── Types (JSDoc only — no TypeScript required) ─────────────────────────────
/**
 * @typedef {Object} FlatItem — a deliverable or subtask with project context
 * @property {string}   id
 * @property {string}   title
 * @property {string}   status
 * @property {string[]} assignees
 * @property {string[]} dependencies   IDs of tasks that must complete first
 * @property {string}   _projId
 * @property {string}   _projName
 * @property {string}   _projColor
 * @property {boolean}  _isSubtask
 * @property {string|null} _parentDelId
 * @property {string|null} _parentDelTitle
 */

/**
 * Flatten all deliverables and subtasks across all projects,
 * stamping each with project/deliverable context.
 *
 * @param {Array} projects
 * @returns {FlatItem[]}
 */
export function flattenItems(projects) {
  const items = [];
  for (const p of (projects || [])) {
    for (const d of (p.deliverables || [])) {
      items.push({
        ...d,
        _projId:        p.id,
        _projName:      p.name,
        _projColor:     p.color,
        _isSubtask:     false,
        _parentDelId:   null,
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
 * Given an updated project tree (post-completion), return all tasks that
 * have just become "ready to start" because completedItemId was marked Done.
 *
 * A task is Ready when:
 *   1. It has at least one assignee
 *   2. Its status is Not Started (not In Progress, Done, or Blocked)
 *   3. ALL of its declared dependencies are now Done
 *      — OR — (no dependencies) it is the next subtask in sequence
 *
 * @param {Array}  projects        — project tree AFTER the completion is applied
 * @param {string} completedItemId — the task that was just marked Done
 * @returns {FlatItem[]}
 */
export function getReadyTasks(projects, completedItemId) {
  const allItems = flattenItems(projects);
  const completedItem = allItems.find(x => x.id === completedItemId);
  if (!completedItem) return [];

  const candidates = [];
  const seen = new Set();

  // ── Strategy 1: dependency graph ───────────────────────────────────────────
  for (const item of allItems) {
    if (item.id === completedItemId) continue;
    if (item.status !== "Not Started") continue;            // only trigger for Not Started
    const deps = item.dependencies || [];
    if (!deps.includes(completedItemId)) continue;          // must depend on completed task

    // All other dependencies must also be Done
    const allReady = deps.every(depId => {
      const dep = allItems.find(x => x.id === depId);
      return dep?.status === "Done";
    });

    if (allReady && !seen.has(item.id)) {
      candidates.push(item);
      seen.add(item.id);
    }
  }

  // ── Strategy 2: sequential fallback (no explicit deps declared) ────────────
  // Only fires for subtasks, only when the completed task has no explicit
  // dependents found above (avoids double-firing on mixed projects).
  if (completedItem._isSubtask && completedItem._parentDelId) {
    for (const p of (projects || [])) {
      const parentDel = p.deliverables.find(d => d.id === completedItem._parentDelId);
      if (!parentDel) continue;

      const subtasks = parentDel.subtasks || [];
      const idx = subtasks.findIndex(s => s.id === completedItemId);
      if (idx < 0 || idx + 1 >= subtasks.length) continue;

      const next = subtasks[idx + 1];
      const hasDeps     = (next.dependencies || []).length > 0;
      const alreadySeen = seen.has(next.id);
      const readyStatus = next.status === "Not Started";

      if (!hasDeps && !alreadySeen && readyStatus) {
        candidates.push({
          ...next,
          _projId:         p.id,
          _projName:       p.name,
          _projColor:      p.color,
          _isSubtask:      true,
          _parentDelId:    parentDel.id,
          _parentDelTitle: parentDel.title,
        });
        seen.add(next.id);
      }
      break; // only check one project per parent deliverable
    }
  }

  // Only notify for tasks that actually have someone assigned
  return candidates.filter(t => (t.assignees || []).length > 0);
}

/**
 * Check if there is already an unread "task_ready" notification for a task.
 * Prevents duplicate notifications while a task is still pending action.
 *
 * @param {string} taskId
 * @param {Array}  notifications — current notification array from state
 * @returns {boolean}
 */
export function hasPendingReadyNotif(taskId, notifications) {
  return (notifications || []).some(
    n => n.type === "task_ready" && n.taskId === taskId && !n.isRead
  );
}

/**
 * Build notification objects for newly-ready tasks.
 * Returns one notification per assignee per task.
 *
 * @param {Object} params
 * @param {FlatItem[]} params.readyTasks
 * @param {Array}      params.people              — people array from state
 * @param {string}     params.completedByPersonId — who just completed the predecessor
 * @param {Array}      params.notifications        — existing notifications for dup check
 * @returns {Array}    array of notification objects ready to push into state
 */
export function buildReadyNotifications({ readyTasks, people, completedByPersonId, notifications }) {
  const results = [];

  for (const task of readyTasks) {
    if (hasPendingReadyNotif(task.id, notifications)) continue;  // skip duplicates

    for (const personId of (task.assignees || [])) {
      const person = (people || []).find(p => p.id === personId);
      if (!person) continue;

      const notifId  = `notif_ready_${task.id}_${personId}_${Date.now()}`;
      const projPart = task._projName ? ` in "${task._projName}"` : "";
      const message  = `"${task.title || "A task"}"${projPart} is now ready for you to begin.`;

      results.push({
        id:                  notifId,
        type:                "task_ready",
        message,
        assignedToPersonId:  personId,
        completedByPersonId: completedByPersonId || null,
        taskId:              task.id,
        projectId:           task._projId          || null,
        deliverableId:       task._parentDelId      || null,
        isRead:              false,
        reviewedAt:          null,
        createdAt:           new Date().toISOString(),
        // Metadata for the UI
        _taskTitle:          task.title,
        _projName:           task._projName,
        _projColor:          task._projColor,
        _isSubtask:          task._isSubtask,
      });
    }
  }

  return results;
}