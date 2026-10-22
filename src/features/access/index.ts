/* Public API of the access feature (role-based access control). Other features and app/ import only from here. */
export { AccessProvider } from './model/AccessProvider';
export { useAccess, usePermission, useAccessDirectory } from './model/accessContext';
export type { AccessContextValue } from './model/accessContext';
export { Can } from './components/Can';
export { AccessDenied } from './components/AccessDenied';
export { RouteAccessGuard } from './components/RouteAccessGuard';
export { PermissionExplorer, PermissionLegend } from './components/PermissionExplorer';
export {
  ACTIONS, ACTION_LABELS, MODULES, MODULE_GROUPS, isModuleId, moduleById, modulesInGroup,
} from './model/modules';
export type { ModuleDefinition, ModuleGroupId, ModuleId, PermissionAction } from './model/modules';
export {
  OWNER_ROLE_ID, ROLE_DESCRIPTION_MAX, ROLE_NAME_MAX, SYSTEM_ROLE_IDS,
  can, cellState, cloneMatrix, cloneName, countGrants, customRoleToAccessRole, defaultMatrix, describeChange, describeModuleGrants,
  diffMatrices, firstGrantedModuleId, hasAnyView, isApplicable, isRestricted, isSystemRoleId, matricesEqual, normalizeMatrix, sanitizeMatrix,
  summarizeDiff, systemRoles, toGrants, totalGrantable, validateRoleForm,
} from './model/permissions';
export type { AccessRole, CellState, PermissionChange, PermissionMatrix as PermissionMatrixValue, RoleFormErrors, RoleFormInput, SystemRoleId } from './model/permissions';
export { allRoles, buildSelfMember, findRole, legacyRoleToRoleId, roleIdToLegacyRole } from './model/roleResolution';
