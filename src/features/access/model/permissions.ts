import type { AccessActionKey, CustomRoleRecord } from '../../../data-access';
import {
  ACTIONS,
  ACTION_LABELS,
  MODULES,
  isModuleId,
  moduleById,
  type ModuleDefinition,
  type ModuleId,
  type PermissionAction,
} from './modules';

/** Granted actions per module. A module that is missing has nothing granted. */
export type PermissionMatrix = Partial<Record<ModuleId, PermissionAction[]>>;

export const SYSTEM_ROLE_IDS = ['owner', 'admin', 'analyst', 'viewer'] as const;
export type SystemRoleId = (typeof SYSTEM_ROLE_IDS)[number];

export interface AccessRole {
  id: string;
  name: string;
  description: string;
  kind: 'system' | 'custom';
  permissions: PermissionMatrix;
  /** ISO timestamp of the last edit; system roles are never edited. */
  updatedAt: string | null;
  updatedBy: string | null;
}

export type CellState = 'granted' | 'not_granted' | 'not_applicable' | 'restricted';

export const OWNER_ROLE_ID: SystemRoleId = 'owner';

/* ------------------------------------------------------------------------------------------ *
 * Applicability
 * ------------------------------------------------------------------------------------------ */

/** True when the module has this action at all. */
export function isApplicable(module: ModuleDefinition, action: PermissionAction): boolean {
  return module.actions.includes(action);
}

/** True when the action exists but only the Owner role may hold it. */
export function isRestricted(module: ModuleDefinition, action: PermissionAction, roleId: string): boolean {
  return roleId !== OWNER_ROLE_ID && (module.ownerOnly?.includes(action) ?? false);
}

/** An action the role's matrix can actually carry: applicable and not restricted for that role. */
export function isGrantable(module: ModuleDefinition, action: PermissionAction, roleId: string): boolean {
  return isApplicable(module, action) && !isRestricted(module, action, roleId);
}

export function cellState(module: ModuleDefinition, action: PermissionAction, matrix: PermissionMatrix, roleId: string): CellState {
  if (!isApplicable(module, action)) return 'not_applicable';
  if (isRestricted(module, action, roleId)) return 'restricted';
  return (matrix[module.id as ModuleId] ?? []).includes(action) ? 'granted' : 'not_granted';
}

/* ------------------------------------------------------------------------------------------ *
 * Default matrices for the built-in roles
 * ------------------------------------------------------------------------------------------ */

function everything(filter?: (module: ModuleDefinition, action: PermissionAction) => boolean): PermissionMatrix {
  const matrix: PermissionMatrix = {};
  for (const module of MODULES as readonly ModuleDefinition[]) {
    const actions = module.actions.filter((action) => !filter || filter(module, action));
    if (actions.length > 0) matrix[module.id as ModuleId] = [...actions];
  }
  return matrix;
}

function ownerMatrix(): PermissionMatrix {
  return everything();
}

/** Admin: everything except ownership transfer and editing the subscription. */
function adminMatrix(): PermissionMatrix {
  return everything((module, action) => !module.ownerOnly?.includes(action) && !(module.id === 'subscription' && action === 'EDIT'));
}

const ANALYST_MANAGE = new Set<string>(['budgets', 'smartAlerts', 'sap.alerts']);

/** Administration pages a read-only role may still open (the profile menu links to them). */
const READ_ONLY_ADMIN = new Set<string>(['subscription']);

/** Analyst: view and export cloud and SAP data, and manage budgets and alerts. */
function analystMatrix(): PermissionMatrix {
  return everything((module, action) => {
    if (module.group === 'administration') return (module.id === 'syncLogs' || READ_ONLY_ADMIN.has(module.id)) && action === 'VIEW';
    if (ANALYST_MANAGE.has(module.id)) return true;
    if (module.id === 'billing' || module.id === 'invoices') return action === 'VIEW';
    return action === 'VIEW' || action === 'EXPORT';
  });
}

/** Viewer: view only. No administration pages beyond reading the subscription. */
function viewerMatrix(): PermissionMatrix {
  return everything((module, action) => action === 'VIEW' && (module.group !== 'administration' || READ_ONLY_ADMIN.has(module.id)));
}

const SYSTEM_ROLE_DEFS: Record<SystemRoleId, { name: string; description: string; build: () => PermissionMatrix }> = {
  owner: {
    name: 'Owner',
    description: 'Full control of the organisation, including transferring ownership and editing the subscription. Cannot be edited or removed.',
    build: ownerMatrix,
  },
  admin: {
    name: 'Admin',
    description: 'Everything except transferring ownership and editing the subscription.',
    build: adminMatrix,
  },
  analyst: {
    name: 'Analyst',
    description: 'Views and exports cloud and SAP data, and manages budgets and alerts.',
    build: analystMatrix,
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to cloud and SAP data. No administration pages.',
    build: viewerMatrix,
  },
};

export function isSystemRoleId(id: string): id is SystemRoleId {
  return (SYSTEM_ROLE_IDS as readonly string[]).includes(id);
}

/** The default matrix for a built-in role. A fresh object each call. */
export function defaultMatrix(id: SystemRoleId): PermissionMatrix {
  return SYSTEM_ROLE_DEFS[id].build();
}

export function systemRoles(): AccessRole[] {
  return SYSTEM_ROLE_IDS.map((id) => ({
    id,
    name: SYSTEM_ROLE_DEFS[id].name,
    description: SYSTEM_ROLE_DEFS[id].description,
    kind: 'system' as const,
    permissions: SYSTEM_ROLE_DEFS[id].build(),
    updatedAt: null,
    updatedBy: null,
  }));
}

/* ------------------------------------------------------------------------------------------ *
 * Reading and sanitising
 * ------------------------------------------------------------------------------------------ */

/**
 * Keeps only modules and actions this registry knows and the role may hold. A backend (or an older
 * saved role) can mention modules that no longer exist; they are dropped rather than trusted.
 */
export function sanitizeMatrix(raw: Record<string, readonly AccessActionKey[] | readonly string[] | undefined> | undefined, roleId: string): PermissionMatrix {
  const matrix: PermissionMatrix = {};
  for (const [key, actions] of Object.entries(raw ?? {})) {
    if (!isModuleId(key)) continue;
    const module = moduleById(key);
    if (!module) continue;
    const kept = ACTIONS.filter((action) => (actions ?? []).includes(action) && isGrantable(module, action, roleId));
    if (kept.length > 0) matrix[key] = kept;
  }
  return normalizeMatrix(matrix, roleId);
}

/**
 * Every action other than View needs View on the same module: granting Edit without being able to
 * see the page is meaningless. Fills the missing Views in.
 */
export function normalizeMatrix(matrix: PermissionMatrix, roleId: string): PermissionMatrix {
  const next: PermissionMatrix = {};
  for (const module of MODULES as readonly ModuleDefinition[]) {
    const granted = matrix[module.id as ModuleId] ?? [];
    if (granted.length === 0) continue;
    const wantsView = isGrantable(module, 'VIEW', roleId) && granted.some((action) => action !== 'VIEW');
    const merged = ACTIONS.filter((action) => granted.includes(action) || (action === 'VIEW' && wantsView));
    next[module.id as ModuleId] = merged;
  }
  return next;
}

export function customRoleToAccessRole(record: CustomRoleRecord): AccessRole {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    kind: 'custom',
    permissions: sanitizeMatrix(record.permissions, record.id),
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
  };
}

export function toGrants(matrix: PermissionMatrix): Record<string, AccessActionKey[]> {
  return Object.fromEntries(Object.entries(matrix).filter(([, actions]) => (actions?.length ?? 0) > 0).map(([id, actions]) => [id, [...(actions ?? [])]]));
}

/* ------------------------------------------------------------------------------------------ *
 * The question the whole app asks
 * ------------------------------------------------------------------------------------------ */

/**
 * Can this role do `action` on `module`? The Owner can do everything that exists; every other role
 * needs the grant, and an action the module doesn't have, or that only the Owner may hold, is
 * always refused.
 */
export function can(role: Pick<AccessRole, 'id' | 'permissions'> | undefined, moduleId: ModuleId | string, action: PermissionAction): boolean {
  if (!role) return false;
  const module = moduleById(moduleId);
  if (!module || !isApplicable(module, action)) return false;
  if (role.id === OWNER_ROLE_ID) return true;
  if (isRestricted(module, action, role.id)) return false;
  return (role.permissions[module.id as ModuleId] ?? []).includes(action);
}

/* ------------------------------------------------------------------------------------------ *
 * Editing a matrix
 * ------------------------------------------------------------------------------------------ */

/**
 * Flips one cell. Turning on anything also turns on View for that module; turning View off clears
 * the module's other actions. Cells that are not grantable are left alone.
 */
export function toggleCell(matrix: PermissionMatrix, moduleId: ModuleId, action: PermissionAction, roleId: string): PermissionMatrix {
  const module = moduleById(moduleId);
  if (!module || !isGrantable(module, action, roleId)) return matrix;
  const current = matrix[moduleId] ?? [];
  const on = !current.includes(action);
  let next: PermissionAction[];
  if (on) next = [...current, action];
  else if (action === 'VIEW' && isGrantable(module, 'VIEW', roleId)) next = [];
  else next = current.filter((item) => item !== action);
  return setModule(matrix, moduleId, next, roleId);
}

function setModule(matrix: PermissionMatrix, moduleId: ModuleId, actions: PermissionAction[], roleId: string): PermissionMatrix {
  const module = moduleById(moduleId);
  if (!module) return matrix;
  const wantsView = isGrantable(module, 'VIEW', roleId) && actions.length > 0;
  const ordered = ACTIONS.filter((action) => actions.includes(action) || (action === 'VIEW' && wantsView));
  const next = { ...matrix };
  if (ordered.length === 0) delete next[moduleId];
  else next[moduleId] = ordered;
  return next;
}

/** Grants or clears every grantable action in a module row. */
export function setRow(matrix: PermissionMatrix, moduleId: ModuleId, granted: boolean, roleId: string): PermissionMatrix {
  const module = moduleById(moduleId);
  if (!module) return matrix;
  const actions = granted ? module.actions.filter((action) => isGrantable(module, action, roleId)) : [];
  return setModule(matrix, moduleId, actions, roleId);
}

/** Grants or clears one action across the given modules (default: all). */
export function setColumn(matrix: PermissionMatrix, action: PermissionAction, granted: boolean, roleId: string, moduleIds?: readonly ModuleId[]): PermissionMatrix {
  let next = matrix;
  for (const module of MODULES as readonly ModuleDefinition[]) {
    if (moduleIds && !moduleIds.includes(module.id as ModuleId)) continue;
    if (!isGrantable(module, action, roleId)) continue;
    const has = (next[module.id as ModuleId] ?? []).includes(action);
    if (has !== granted) next = toggleCell(next, module.id as ModuleId, action, roleId);
  }
  return next;
}

function grantableIn(module: ModuleDefinition, roleId: string): PermissionAction[] {
  return module.actions.filter((action) => isGrantable(module, action, roleId));
}

/** True when every grantable action in the row is granted (and there is at least one). */
export function isRowFullyGranted(matrix: PermissionMatrix, moduleId: ModuleId, roleId: string): boolean {
  const module = moduleById(moduleId);
  if (!module) return false;
  const grantable = grantableIn(module, roleId);
  const current = matrix[moduleId] ?? [];
  return grantable.length > 0 && grantable.every((action) => current.includes(action));
}

export function isRowPartiallyGranted(matrix: PermissionMatrix, moduleId: ModuleId, roleId: string): boolean {
  return !isRowFullyGranted(matrix, moduleId, roleId) && (matrix[moduleId] ?? []).length > 0;
}

/** True when the action is granted on every module that can carry it (and there is at least one). */
export function isColumnFullyGranted(matrix: PermissionMatrix, action: PermissionAction, roleId: string, moduleIds?: readonly ModuleId[]): boolean {
  const carriers = (MODULES as readonly ModuleDefinition[]).filter((module) => (!moduleIds || moduleIds.includes(module.id as ModuleId)) && isGrantable(module, action, roleId));
  return carriers.length > 0 && carriers.every((module) => (matrix[module.id as ModuleId] ?? []).includes(action));
}

export function isColumnApplicable(action: PermissionAction, roleId: string): boolean {
  return (MODULES as readonly ModuleDefinition[]).some((module) => isGrantable(module, action, roleId));
}

/* ------------------------------------------------------------------------------------------ *
 * Counting, cloning, validating, diffing
 * ------------------------------------------------------------------------------------------ */

export function countGrants(matrix: PermissionMatrix): { grants: number; modules: number } {
  let grants = 0;
  let modules = 0;
  for (const actions of Object.values(matrix)) {
    if (actions && actions.length > 0) {
      grants += actions.length;
      modules += 1;
    }
  }
  return { grants, modules };
}

/** The total number of cells a role could hold, for "37 of 92" style summaries. */
export function totalGrantable(roleId: string): number {
  return (MODULES as readonly ModuleDefinition[]).reduce((sum, module) => sum + grantableIn(module, roleId).length, 0);
}

/** "Copy of Analyst", "Copy of Analyst (2)", … — the first name nobody is using. */
export function cloneName(sourceName: string, existingNames: readonly string[]): string {
  const taken = new Set(existingNames.map((name) => name.trim().toLowerCase()));
  const base = `Copy of ${sourceName.trim()}`;
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base} (${n})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} (${Date.now()})`;
}

/** The permissions a duplicate starts with: the source's matrix as a custom role's own grants. */
export function cloneMatrix(matrix: PermissionMatrix, newRoleId: string): PermissionMatrix {
  return sanitizeMatrix(toGrants(matrix), newRoleId);
}

export const ROLE_NAME_MAX = 40;
export const ROLE_DESCRIPTION_MAX = 160;

export interface RoleFormInput {
  name: string;
  description: string;
}
export type RoleFormErrors = Partial<Record<keyof RoleFormInput, string>>;

export function validateRoleForm(input: RoleFormInput, existing: ReadonlyArray<Pick<AccessRole, 'id' | 'name'>>, selfId?: string): RoleFormErrors {
  const errors: RoleFormErrors = {};
  const name = input.name.trim();
  if (!name) errors.name = 'Enter a name for the role.';
  else if (name.length > ROLE_NAME_MAX) errors.name = `Keep the name to ${ROLE_NAME_MAX} characters or fewer.`;
  else if (existing.some((role) => role.id !== selfId && role.name.trim().toLowerCase() === name.toLowerCase())) errors.name = 'A role with this name already exists.';
  if (input.description.trim().length > ROLE_DESCRIPTION_MAX) errors.description = `Keep the description to ${ROLE_DESCRIPTION_MAX} characters or fewer.`;
  return errors;
}

export interface PermissionChange {
  moduleId: ModuleId;
  moduleLabel: string;
  action: PermissionAction;
  change: 'granted' | 'revoked';
}

/** Every cell that differs between two matrices, in registry order. */
export function diffMatrices(before: PermissionMatrix, after: PermissionMatrix): PermissionChange[] {
  const changes: PermissionChange[] = [];
  for (const module of MODULES as readonly ModuleDefinition[]) {
    const was = before[module.id as ModuleId] ?? [];
    const now = after[module.id as ModuleId] ?? [];
    for (const action of ACTIONS) {
      const hadIt = was.includes(action);
      const hasIt = now.includes(action);
      if (hadIt === hasIt) continue;
      changes.push({ moduleId: module.id as ModuleId, moduleLabel: module.label, action, change: hasIt ? 'granted' : 'revoked' });
    }
  }
  return changes;
}

export function describeChange(change: PermissionChange): string {
  return `${change.change === 'granted' ? 'Grant' : 'Revoke'} ${ACTION_LABELS[change.action]} on ${change.moduleLabel}`;
}

/** "3 granted, 1 revoked" — or "No changes". */
export function summarizeDiff(changes: readonly PermissionChange[]): string {
  if (changes.length === 0) return 'No changes';
  const granted = changes.filter((change) => change.change === 'granted').length;
  const revoked = changes.length - granted;
  return [granted > 0 && `${granted} granted`, revoked > 0 && `${revoked} revoked`].filter(Boolean).join(', ');
}

/** A one-line "View, Edit" style list of what a role holds on a module, for before/after audit values. */
export function describeModuleGrants(matrix: PermissionMatrix, moduleId: ModuleId): string {
  const actions = matrix[moduleId] ?? [];
  return actions.length === 0 ? 'No access' : actions.map((action) => ACTION_LABELS[action]).join(', ');
}

export function matricesEqual(a: PermissionMatrix, b: PermissionMatrix): boolean {
  return diffMatrices(a, b).length === 0;
}

/** Whether the role may open at least one page; used to warn about roles that can see nothing. */
export function hasAnyView(role: Pick<AccessRole, 'id' | 'permissions'>): boolean {
  return (MODULES as readonly ModuleDefinition[]).some((module) => can(role, module.id, 'VIEW'));
}
