import { afterEach, describe, expect, it } from 'vitest';
import { accessRepository } from '../../../data-access';
import { systemRoles } from '../../access';
import { inviteMember, type InviteContext } from './inviteMember';
import type { OrgMember } from './userManagementTypes';

const owner: OrgMember = { userId: 'u0', fullName: 'Owner', email: 'owner@x.com', role: 'owner', roleId: 'owner', status: 'active' };

const context = (extra: Partial<InviteContext> = {}): InviteContext => ({
  members: [owner],
  roles: systemRoles(),
  seats: { limit: 5, used: 1, available: 4, full: false },
  cloudAccess: ['azure', 'aws'],
  ...extra,
});

afterEach(() => accessRepository.reset());

describe('inviteMember', () => {
  it('adds an active member named from the address, with the role asked for', () => {
    const result = inviteMember({ email: ' Nina.Patel@X.com ', roleId: 'analyst' }, context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.member).toMatchObject({ fullName: 'Nina Patel', email: 'nina.patel@x.com', roleId: 'analyst', role: 'member', status: 'active' });
    expect(accessRepository.getSnapshot().members.some((m) => m.email === 'nina.patel@x.com')).toBe(true);
  });

  it('rejects an invalid address, a duplicate, the Owner role and a full plan', () => {
    expect(inviteMember({ email: 'nope', roleId: 'viewer' }, context())).toEqual({ ok: false, error: 'Enter a valid email address.' });
    expect(inviteMember({ email: 'OWNER@x.com', roleId: 'viewer' }, context())).toMatchObject({ ok: false });
    expect(inviteMember({ email: 'a@x.com', roleId: 'owner' }, context())).toMatchObject({ ok: false, error: 'Choose a role for the new member.' });
    expect(inviteMember({ email: 'a@x.com', roleId: 'viewer' }, context({ seats: { limit: 1, used: 1, available: 0, full: true } }))).toMatchObject({ ok: false });
  });

  it('gives access only to the providers the organisation has', () => {
    const result = inviteMember({ email: 'a@x.com', roleId: 'viewer' }, context({ cloudAccess: ['azure'] }));
    if (!result.ok) throw new Error('expected ok');
    expect(result.member.canViewAws).toBe(false);
    expect(result.member.canViewAzure).toBe(true);
  });
});
