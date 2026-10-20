import type { LegacyMemberRole, MemberRecord, MemberStatusKey } from '../../../data-access';
import { legacyRoleToRoleId } from '../../access';

export type MemberStatus = MemberStatusKey;
export type MemberRole = LegacyMemberRole;

/**
 * A member of the organisation. `role` is the three-way role the organisation API still sends;
 * `roleId` is the finer-grained role (built-in or custom) that decides what they can do. Where only
 * `role` is known, the role id is derived from it.
 */
export type OrgMember = MemberRecord;

/** The role id in force for a member: their own, or the one implied by the legacy role. */
export function memberRoleId(member: Pick<OrgMember, 'role' | 'roleId'>): string {
  return member.roleId ?? legacyRoleToRoleId(member.role);
}

/** How many members hold each role id. */
export function countMembersByRole(members: readonly OrgMember[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const member of members) {
    const id = memberRoleId(member);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/** Members who receive alert e-mails, among those who can still sign in. */
export function alertRecipients(members: readonly OrgMember[]): number {
  return members.filter((member) => member.status === 'active' && member.alertsEnabled).length;
}

export function isMemberPrivileged(member: OrgMember): boolean {
  return member.role === 'admin' || member.role === 'owner';
}

/** Ported from the reference's utils/formatters.js sortMembers: the current
 * user first, then admins/owners, then alphabetical by name. */
export function sortMembers(members: OrgMember[], currentUserId: string | undefined): OrgMember[] {
  return [...members].sort((a, b) => {
    if (a.userId === currentUserId) return -1;
    if (b.userId === currentUserId) return 1;
    const aPriv = isMemberPrivileged(a);
    const bPriv = isMemberPrivileged(b);
    if (aPriv && !bPriv) return -1;
    if (!aPriv && bPriv) return 1;
    return a.fullName.localeCompare(b.fullName);
  });
}

export interface SeatSummary {
  /** Seats the plan allows; null when unlimited (0 or not set — the reference's own sentinel). */
  limit: number | null;
  /** Active members; inactive members don't hold a seat. */
  used: number;
  /** Seats still free; null when unlimited. */
  available: number | null;
  /** True when no further member can be added or re-activated. */
  full: boolean;
}

export function seatSummary(members: OrgMember[], maxUsers: number | undefined): SeatSummary {
  const used = members.filter((m) => m.status === 'active').length;
  const limit = maxUsers && maxUsers > 0 ? maxUsers : null;
  const available = limit === null ? null : Math.max(0, limit - used);
  return { limit, used, available, full: available === 0 };
}

export interface NewMemberInput {
  fullName: string;
  email: string;
  role?: MemberRole;
  roleId?: string;
}

export type NewMemberErrors = Partial<Record<keyof NewMemberInput, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateNewMember(input: NewMemberInput, existing: OrgMember[]): NewMemberErrors {
  const errors: NewMemberErrors = {};
  if (!input.fullName.trim()) errors.fullName = 'Enter the member’s full name.';
  const email = input.email.trim().toLowerCase();
  if (!email) errors.email = 'Enter a work email address.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.';
  else if (existing.some((m) => m.email.toLowerCase() === email)) errors.email = 'This email is already a member of your organisation.';
  return errors;
}
