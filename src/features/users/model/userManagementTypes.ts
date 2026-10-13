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
