import { accessRepository, auditRepository, type CustomRoleRecord, type MemberRecord } from '../../../data-access';
import {
  allRoles,
  cloneMatrix,
  cloneName,
  describeModuleGrants,
  diffMatrices,
  findRole,
  roleIdToLegacyRole,
  sanitizeMatrix,
  summarizeDiff,
  toGrants,
  type ModuleId,
  type PermissionMatrixValue,
} from '../../access';
import { recordAuditEvent } from '../../audit';
import { memberRoleId } from './userManagementTypes';

/**
 * Every write the User Management page makes, against the in-memory directory, each leaving a line
 * in the audit trail. The page decides who may call them (via `<Can>`); the repository stays dumb.
 */
const MODULE = 'Access control';

function roleName(roleId: string): string {
  return findRole(allRoles(accessRepository.getSnapshot().customRoles), roleId)?.name ?? roleId;
}

function memberById(userId: string): MemberRecord | undefined {
  return accessRepository.getSnapshot().members.find((member) => member.userId === userId);
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'role';
}

function newRoleId(name: string): string {
  return `role-${slug(name)}-${Date.now().toString(36)}`;
}

const onOff = (value: boolean | undefined) => (value ? 'On' : 'Off');

export const directoryActions = {
  addMember(member: MemberRecord): void {
    accessRepository.addMember(member);
    recordAuditEvent({
      action: 'User added',
      target: member.email,
      module: MODULE,
      detail: `Added as ${roleName(memberRoleId(member))}.`,
      source: 'Web',
    });
  },

  setMemberRole(userId: string, roleId: string, action = 'Role changed'): void {
    const member = memberById(userId);
    if (!member) return;
    const before = roleName(memberRoleId(member));
    const after = roleName(roleId);
    accessRepository.updateMember(userId, { roleId, role: roleIdToLegacyRole(roleId) });
    recordAuditEvent({
      action,
      target: member.email,
      module: MODULE,
      detail: `Moved from ${before} to ${after}.`,
      changes: [{ field: 'Role', before, after }],
      source: 'Web',
    });
  },

  setMemberStatus(userId: string, status: MemberRecord['status']): void {
    const member = memberById(userId);
    if (!member) return;
    accessRepository.updateMember(userId, { status });
    recordAuditEvent({
      action: status === 'active' ? 'User activated' : 'User deactivated',
      target: member.email,
      module: MODULE,
      detail: status === 'active' ? 'Seat taken. Access restored.' : 'Seat released. History kept.',
      source: 'Web',
    });
  },

  setMemberAlerts(userId: string, enabled: boolean): void {
    const member = memberById(userId);
    if (!member) return;
    accessRepository.updateMember(userId, { alertsEnabled: enabled });
    recordAuditEvent({
      action: enabled ? 'Alerts turned on' : 'Alerts turned off',
      target: member.email,
      module: MODULE,
      detail: `Alert e-mails switched ${enabled ? 'on' : 'off'} for this member.`,
      changes: [{ field: 'Alert e-mails', before: onOff(member.alertsEnabled), after: onOff(enabled) }],
      source: 'Web',
    });
  },

  /** `label` reads like "Azure view" or "AWS access"; `before` and `after` like "Off" and "On". */
  setProviderAccess(userId: string, patch: Partial<MemberRecord>, label: string, before: string, after: string): void {
    const member = memberById(userId);
    if (!member) return;
    accessRepository.updateMember(userId, patch);
    recordAuditEvent({
      action: 'Provider access changed',
      target: member.email,
      module: MODULE,
      changes: [{ field: label, before, after }],
      source: 'Web',
    });
  },

  createRole(input: { name: string; description: string; permissions?: PermissionMatrixValue }): string {
    const now = new Date().toISOString();
    const id = newRoleId(input.name);
    const record: CustomRoleRecord = {
      id,
      name: input.name.trim(),
      description: input.description.trim(),
      permissions: toGrants(sanitizeMatrix(input.permissions ?? {}, id)),
      createdAt: now,
      updatedAt: now,
      updatedBy: auditRepository.getActor().name,
    };
    accessRepository.createRole(record);
    recordAuditEvent({ action: 'Role created', target: `Role · ${record.name}`, module: MODULE, detail: record.description || undefined, source: 'Web' });
    return id;
  },

  updateRoleDetails(id: string, input: { name: string; description: string }): void {
    const existing = accessRepository.getSnapshot().customRoles.find((role) => role.id === id);
    if (!existing) return;
    const next = { name: input.name.trim(), description: input.description.trim() };
    accessRepository.updateRole(id, { ...next, updatedAt: new Date().toISOString(), updatedBy: auditRepository.getActor().name });
    const changes = [
      next.name !== existing.name && { field: 'Name', before: existing.name, after: next.name },
      next.description !== existing.description && { field: 'Description', before: existing.description || '(none)', after: next.description || '(none)' },
    ].filter((change): change is { field: string; before: string; after: string } => Boolean(change));
    recordAuditEvent({ action: 'Role edited', target: `Role · ${next.name}`, module: MODULE, changes, source: 'Web' });
  },

  /** Saves a custom role's matrix. Returns how many cells changed. */
  saveRolePermissions(id: string, matrix: PermissionMatrixValue): number {
    const roles = allRoles(accessRepository.getSnapshot().customRoles);
    const existing = findRole(roles, id);
    if (!existing || existing.kind !== 'custom') return 0;
    const clean = sanitizeMatrix(toGrants(matrix), id);
    const changes = diffMatrices(existing.permissions, clean);
    accessRepository.updateRole(id, { permissions: toGrants(clean), updatedAt: new Date().toISOString(), updatedBy: auditRepository.getActor().name });
    const modules = [...new Set(changes.map((change) => change.moduleId))] as ModuleId[];
    recordAuditEvent({
      action: 'Permission matrix saved',
      target: `Role · ${existing.name}`,
      module: MODULE,
      detail: `${summarizeDiff(changes)}.`,
      changes: modules.map((moduleId) => ({
        field: changes.find((change) => change.moduleId === moduleId)?.moduleLabel ?? moduleId,
        before: describeModuleGrants(existing.permissions, moduleId),
        after: describeModuleGrants(clean, moduleId),
      })),
      source: 'Web',
    });
    return changes.length;
  },

  /** Copies any role (built-in or custom) into a new custom role. Returns the new role's id. */
  duplicateRole(sourceId: string): string | null {
    const roles = allRoles(accessRepository.getSnapshot().customRoles);
    const source = findRole(roles, sourceId);
    if (!source) return null;
    const id = newRoleId(source.name);
    const name = cloneName(source.name, roles.map((role) => role.name));
    const now = new Date().toISOString();
    accessRepository.createRole({
      id,
      name,
      description: source.description,
      permissions: toGrants(cloneMatrix(source.permissions, id)),
      createdAt: now,
      updatedAt: now,
      updatedBy: auditRepository.getActor().name,
    });
    recordAuditEvent({ action: 'Role duplicated', target: `Role · ${name}`, module: MODULE, detail: `Copied from ${source.name}.`, source: 'Web' });
    return id;
  },

  /** Deletes a custom role. Refused (returns the member count) while anyone holds it. */
  deleteRole(id: string): { ok: true } | { ok: false; heldBy: number } {
    const snapshot = accessRepository.getSnapshot();
    const role = snapshot.customRoles.find((item) => item.id === id);
    if (!role) return { ok: true };
    const heldBy = snapshot.members.filter((member) => memberRoleId(member) === id).length;
    if (heldBy > 0) return { ok: false, heldBy };
    accessRepository.deleteRole(id);
    recordAuditEvent({ action: 'Role deleted', target: `Role · ${role.name}`, module: MODULE, source: 'Web' });
    return { ok: true };
  },
};
