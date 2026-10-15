export type MemberStatus = 'active' | 'inactive';
export type MemberRole = 'admin' | 'owner' | 'member';

export interface OrgMember {
  userId: string;
  fullName: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  canViewAzure?: boolean;
  canViewAws?: boolean;
  /** Reference quirk, kept intentionally: BTP view defaults to true (undefined
   * counts as viewable) — every other provider defaults to false. */
  canViewBtp?: boolean;
  canViewGcp?: boolean;
  azureReadOnly?: boolean;
  awsReadOnly?: boolean;
  btpReadOnly?: boolean;
  gcpReadOnly?: boolean;
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
  role: MemberRole;
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
