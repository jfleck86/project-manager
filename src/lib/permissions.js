/**
 * PulseX — Centralized Permission Helpers  (Phase 1 RBAC)
 * src/lib/permissions.js
 *
 * Usage:
 *   import { canCreateProject, canAccessKPIDashboard } from "../lib/permissions";
 *   if (canCreateProject(currentRole)) { ... }
 *
 * Role hierarchy (highest → lowest):
 *   admin > leadership > project_manager > contributor > viewer
 *
 * "user" throughout this file is the role string (e.g. "admin", "project_manager").
 * Pass currentRole wherever you call these helpers.
 */

// ─── Role Constants ─────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN:           "admin",
  LEADERSHIP:      "leadership",
  PROJECT_MANAGER: "project_manager",
  CONTRIBUTOR:     "contributor",
  VIEWER:          "viewer",
};

/** All valid role values (matches the DB check constraint). */
export const ALL_ROLES = Object.values(ROLES);

/** Human-readable display labels. */
export const ROLE_LABELS = {
  admin:           "Admin",
  leadership:      "Leadership",
  project_manager: "Project Manager",
  contributor:     "Contributor",
  viewer:          "Viewer",
};

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Normalize legacy "member" role to contributor for back-compat. */
export function normalize(role) {
  if (!role) return ROLES.VIEWER;
  if (role === "member") return ROLES.CONTRIBUTOR;   // legacy migration
  return role;
}

function is(role, ...allowed) {
  return allowed.includes(normalize(role));
}

// ─── Project Permissions ─────────────────────────────────────────────────────

/**
 * Can the user see ALL projects (not just their own)?
 * Contributors/Viewers see only what they're assigned to — enforced in the UI.
 */
export function canViewAllProjects(role) {
  return is(role, ROLES.ADMIN, ROLES.LEADERSHIP, ROLES.PROJECT_MANAGER);
}

export function canCreateProject(role) {
  return is(role, ROLES.ADMIN, ROLES.PROJECT_MANAGER);
}

/**
 * Can the user edit a project?
 * Admin: any project.  PM: only projects where they are the owner.
 */
export function canEditProject(role, project, memberId) {
  const r = normalize(role);
  if (r === ROLES.ADMIN) return true;
  if (r === ROLES.PROJECT_MANAGER) {
    if (!project) return true;                         // generic "can they edit at all?"
    return !memberId || project.ownerId === memberId;  // own projects only
  }
  return false;
}

export function canDeleteProject(role) {
  return is(role, ROLES.ADMIN);
}

export function canArchiveProject(role, project, memberId) {
  const r = normalize(role);
  if (r === ROLES.ADMIN) return true;
  if (r === ROLES.PROJECT_MANAGER) {
    if (!project) return true;
    return !memberId || project.ownerId === memberId;
  }
  return false;
}

// ─── Task / Deliverable Permissions ─────────────────────────────────────────

/**
 * Can update (edit) a task?
 * Contributors can only update tasks assigned to them.
 */
export function canUpdateTask(role, task, memberId) {
  const r = normalize(role);
  if (is(r, ROLES.ADMIN, ROLES.PROJECT_MANAGER)) return true;
  if (r === ROLES.CONTRIBUTOR) {
    if (!task) return false;
    // Allow if they are one of the assignees
    const assignees = task.assignees || task.assignedTo || [];
    if (Array.isArray(assignees)) return assignees.includes(memberId);
    return assignees === memberId;
  }
  return false;
}

export function canCreateDeliverable(role) {
  return is(role, ROLES.ADMIN, ROLES.PROJECT_MANAGER);
}

export function canCreateSubtask(role) {
  return is(role, ROLES.ADMIN, ROLES.PROJECT_MANAGER);
}

// ─── User / Role Management ──────────────────────────────────────────────────

export function canManageUsers(role) {
  return is(role, ROLES.ADMIN);
}

export function canChangeRoles(role) {
  return is(role, ROLES.ADMIN);
}

export function canAccessSettings(role) {
  return is(role, ROLES.ADMIN);
}

export function canInviteUsers(role) {
  return is(role, ROLES.ADMIN);
}

// ─── Navigation / View Access ────────────────────────────────────────────────

export function canAccessKPIDashboard(role) {
  // Phase 1: admin only.  Un-comment the leadership line when ready.
  return is(role, ROLES.ADMIN);
  // return is(role, ROLES.ADMIN, ROLES.LEADERSHIP);
}

export function canAccessHistory(role) {
  return is(role, ROLES.ADMIN);
}

export function canViewReporting(role) {
  return is(role, ROLES.ADMIN, ROLES.LEADERSHIP, ROLES.PROJECT_MANAGER);
}

export function canExportReports(role) {
  return is(role, ROLES.ADMIN, ROLES.LEADERSHIP, ROLES.PROJECT_MANAGER);
}

export function canViewCapacity(role) {
  return is(role, ROLES.ADMIN, ROLES.LEADERSHIP, ROLES.PROJECT_MANAGER);
}

export function canViewForecasting(role) {
  return is(role, ROLES.ADMIN, ROLES.LEADERSHIP, ROLES.PROJECT_MANAGER);
}

export function canViewWorkload(role) {
  return is(role, ROLES.ADMIN, ROLES.LEADERSHIP, ROLES.PROJECT_MANAGER);
}

export function canViewTimeline(role) {
  // Contributor sees limited view; Viewer sees read-only — both get access
  return is(role, ROLES.ADMIN, ROLES.LEADERSHIP, ROLES.PROJECT_MANAGER, ROLES.CONTRIBUTOR, ROLES.VIEWER);
}

export function canViewByPerson(role) {
  return is(role, ROLES.ADMIN, ROLES.LEADERSHIP, ROLES.PROJECT_MANAGER);
}

export function canViewStatus(role) {
  return is(role, ROLES.ADMIN, ROLES.LEADERSHIP, ROLES.PROJECT_MANAGER);
}

// ─── My Hub ──────────────────────────────────────────────────────────────────

/**
 * Can the user open the My Hub view at all?
 * Viewer: no My Hub by default.
 */
export function canAccessMyHub(role) {
  return is(role, ROLES.ADMIN, ROLES.LEADERSHIP, ROLES.PROJECT_MANAGER, ROLES.CONTRIBUTOR);
}

/**
 * Can the user view ANOTHER person's My Hub?
 * Admin always; Leadership summaries only (handled in UI); everyone else: own only.
 */
export function canViewPersonHub(role, targetPersonId, ownMemberId) {
  const r = normalize(role);
  if (r === ROLES.ADMIN) return true;
  return targetPersonId === ownMemberId;
}

// ─── Personal Tasks ──────────────────────────────────────────────────────────

/**
 * Personal tasks are private by default.
 * - User can always see their own
 * - Admin can see all
 * - Everyone else sees only their own
 */
export function canViewPersonalTasks(role, targetPersonId, ownMemberId) {
  const r = normalize(role);
  if (r === ROLES.ADMIN) return true;
  return targetPersonId === ownMemberId;
}

export function canEditPersonalTask(role, task, ownMemberId) {
  const r = normalize(role);
  if (r === ROLES.ADMIN) return true;
  return task?.assignedTo === ownMemberId || task?.personId === ownMemberId;
}

// ─── Proof Queue ─────────────────────────────────────────────────────────────

/**
 * Full proof queue management (create, assign, delete, admin).
 */
export function canManageProofQueue(role) {
  return is(role, ROLES.ADMIN);
}

/**
 * Can submit a proof request (from timeline task).
 */
export function canSubmitProofRequest(role) {
  return is(role, ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.CONTRIBUTOR);
}

/**
 * Can view proof queue entries.
 */
export function canViewProofQueue(role) {
  return is(role, ROLES.ADMIN, ROLES.LEADERSHIP, ROLES.PROJECT_MANAGER, ROLES.CONTRIBUTOR);
}

/**
 * Can update (mark done / change status) on a proof request.
 * Admin: any. PM: linked to their projects. Contributor: assigned to them.
 */
export function canUpdateProofRequest(role, request, memberId) {
  const r = normalize(role);
  if (r === ROLES.ADMIN) return true;
  if (r === ROLES.PROJECT_MANAGER) return !request || request.submittedById === memberId;
  if (r === ROLES.CONTRIBUTOR) return !request || request.assignedMemberId === memberId;
  return false;
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function canManageTemplates(role) {
  return is(role, ROLES.ADMIN, ROLES.PROJECT_MANAGER);
}

// ─── Navigation tab filter ───────────────────────────────────────────────────

/**
 * Returns the list of nav item IDs this role is allowed to see.
 * Pass ALL_NAV_ITEMS and filter client-side.
 */
export function allowedNavItems(role) {
  const r = normalize(role);
  const map = {
    admin:           ["myhub","dashboard","timeline","people","status","workload","reporting","history","kpi"],
    leadership:      ["dashboard","timeline","people","workload","reporting"],
    project_manager: ["myhub","dashboard","timeline","people","status","workload","reporting"],
    contributor:     ["myhub","timeline"],
    viewer:          ["timeline","reporting"],
  };
  return new Set(map[r] || map.viewer);
}

// ─── Role display helpers ────────────────────────────────────────────────────

export function getRoleLabel(role) {
  return ROLE_LABELS[normalize(role)] || "Unknown";
}

export function isAtLeast(role, minRole) {
  const order = [ROLES.VIEWER, ROLES.CONTRIBUTOR, ROLES.PROJECT_MANAGER, ROLES.LEADERSHIP, ROLES.ADMIN];
  return order.indexOf(normalize(role)) >= order.indexOf(minRole);
}