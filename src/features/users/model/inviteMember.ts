import { useAuth } from '../../auth';
import { can, roleIdToLegacyRole, useAccessDirectory, type AccessRole } from '../../access';
import type { CloudProvider } from '../../../shared/types/auth';
import { directoryActions } from './directoryActions';
import { PROVIDER_GROUPS } from './providerGroups';
import { nameFromEmail, seatSummary, validateNewMember, type OrgMember, type SeatSummary } from './userManagementTypes';

/** The role a new member gets until someone picks another: the least-privileged built-in one. */
export const DEFAULT_INVITE_ROLE_ID = 'viewer';

export interface InviteContext {
  members: OrgMember[];
  roles: AccessRole[];
  seats: SeatSummary;
  /** The cloud providers the organisation subscribes to. */
  cloudAccess: CloudProvider[];
}

export type InviteResult = { ok: true; member: OrgMember } | { ok: false; error: string };

/** The roles a new member can hold: every role except Owner. */
export function assignableRoles(roles: AccessRole[]): AccessRole[] {
  return roles.filter((role) => role.id !== 'owner');
}

/**
 * Adds a member by e-mail address and role while a seat is free, the same way the Add user dialog does: the name is
 * taken from the address, the member starts Active, may view what the role may view, and the audit trail gets a line.
 */
export function inviteMember(input: { email: string; roleId: string }, context: InviteContext): InviteResult {
  if (context.seats.full) return { ok: false, error: 'All seats are in use. Remove a member or ask Maitsys for more seats.' };
  const errors = validateNewMember({ fullName: '', email: input.email, roleId: input.roleId }, context.members);
  if (errors.email) return { ok: false, error: errors.email };
  const role = assignableRoles(context.roles).find((item) => item.id === input.roleId);
  if (!role) return { ok: false, error: 'Choose a role for the new member.' };

  const privileged = roleIdToLegacyRole(role.id) !== 'member';
  const canView = (id: CloudProvider) => privileged || (context.cloudAccess.includes(id) && can(role, `provider.${id}`, 'VIEW'));
  const email = input.email.trim().toLowerCase();
  const member: OrgMember = {
    userId: `user-${Date.now().toString(36)}-${context.members.length}`,
    fullName: nameFromEmail(email),
    email,
    role: roleIdToLegacyRole(role.id),
    roleId: role.id,
    status: 'active',
    alertsEnabled: true,
    canViewAzure: canView('azure'),
    canViewAws: canView('aws'),
    canViewBtp: canView('btp'),
    canViewGcp: canView('gcp'),
  };
  directoryActions.addMember(member);
  return { ok: true, member };
}

export interface InviteApi {
  members: OrgMember[];
  roles: AccessRole[];
  seats: SeatSummary;
  /** Adds the person; the directory (and so `members`) updates live. */
  invite: (email: string, roleId: string) => InviteResult;
}

/** What an "invite people" form needs: the live directory, the free seats and a function that adds one person. */
export function useInviteMember(): InviteApi {
  const { cloudAccess, maxUsers } = useAuth();
  const { members, roles } = useAccessDirectory();
  const seats = seatSummary(members, maxUsers);
  const providers = PROVIDER_GROUPS.map((group) => group.id).filter((id) => cloudAccess.includes(id));
  return {
    members,
    roles: assignableRoles(roles),
    seats,
    invite: (email, roleId) => inviteMember({ email, roleId }, { members, roles, seats, cloudAccess: providers }),
  };
}
