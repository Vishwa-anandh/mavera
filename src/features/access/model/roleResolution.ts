import type { CustomRoleRecord, LegacyMemberRole, MemberRecord } from '../../../data-access';
import type { User } from '../../../shared/types/auth';
import { customRoleToAccessRole, isSystemRoleId, systemRoles, type AccessRole, type SystemRoleId } from './permissions';

/**
 * The role a person holds when only the organisation API's three-way role is known. Existing
 * members keep what they could do before roles existed: owners and admins everything their level
 * implies, and plain members the Analyst role (they could already work with the data they could see).
 */
export function legacyRoleToRoleId(role: LegacyMemberRole | undefined): SystemRoleId {
  if (role === 'owner') return 'owner';
  if (role === 'admin') return 'admin';
  return 'analyst';
}

/** The three-way role the API still understands, for a given role id: only Owner and Admin are privileged. */
export function roleIdToLegacyRole(roleId: string): LegacyMemberRole {
  if (roleId === 'owner') return 'owner';
  if (roleId === 'admin') return 'admin';
  return 'member';
}

/** Built-in roles first, then custom roles in the order they were created. */
export function allRoles(customRoles: readonly CustomRoleRecord[]): AccessRole[] {
  return [...systemRoles(), ...customRoles.map(customRoleToAccessRole)];
}

export function findRole(roles: readonly AccessRole[], id: string | undefined): AccessRole | undefined {
  return id ? roles.find((role) => role.id === id) : undefined;
}

/** Which role id is in force: a preview (demo sessions only) wins over the member's own role. */
export function resolveEffectiveRoleId(options: {
  ownRoleId: string;
  previewRoleId: string | null;
  canPreview: boolean;
  roles: readonly AccessRole[];
}): string {
  const { ownRoleId, previewRoleId, canPreview, roles } = options;
  if (canPreview && previewRoleId && findRole(roles, previewRoleId)) return previewRoleId;
  return findRole(roles, ownRoleId) ? ownRoleId : 'viewer';
}

export function isBuiltInRole(id: string): boolean {
  return isSystemRoleId(id);
}

/** The directory entry for the signed-in user: the demo session is the Owner, everyone else maps from their API role. */
export function buildSelfMember(user: User, isDemoSession: boolean | undefined): MemberRecord {
  const roleId = isDemoSession ? 'owner' : legacyRoleToRoleId(user.role);
  return {
    userId: user.id,
    fullName: user.name || user.email.split('@')[0],
    email: user.email,
    role: roleIdToLegacyRole(roleId),
    roleId,
    status: 'active',
    alertsEnabled: true,
    canViewAzure: user.canViewAzure,
    canViewAws: user.canViewAws,
    canViewBtp: user.canViewBtp,
    canViewGcp: user.canViewGcp,
    azureReadOnly: user.azureReadOnly,
    awsReadOnly: user.awsReadOnly,
    btpReadOnly: user.btpReadOnly,
    gcpReadOnly: user.gcpReadOnly,
  };
}
