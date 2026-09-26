import { describe, it, expect } from 'vitest';
import { resolveNav, type ResolvedNavEntry } from './navConfig';
import { derivePermissions } from '../lib/permissions';
import type { User } from '../types/auth';

function group(entries: ResolvedNavEntry[], key: string) {
  const entry = entries.find((e) => e.key === key);
  if (!entry || entry.type !== 'group') throw new Error(`group ${key} not found`);
  return entry;
}

describe('resolveNav', () => {
  it('hides Administration for a non-privileged member', () => {
    const member: User = { id: '1', email: 'a@b.com', role: 'member' };
    const entries = resolveNav(derivePermissions(member, [], false));
    expect(entries.find((e) => e.key === 'administration')).toBeUndefined();
  });

  it('shows Administration for an admin', () => {
    const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };
    const entries = resolveNav(derivePermissions(admin, [], false));
    expect(entries.find((e) => e.key === 'administration')).toBeDefined();
  });

  it('locks every cloud provider for a member with no org cloud access, without throwing', () => {
    const member: User = { id: '1', email: 'a@b.com', role: 'member' };
    expect(() => resolveNav(derivePermissions(member, [], false))).not.toThrow();
    const entries = resolveNav(derivePermissions(member, [], false));
    const cloudCosts = group(entries, 'cloud-costs');
    expect(cloudCosts.children.every((leaf) => leaf.locked)).toBe(true);
  });

  it('unlocks a cloud provider only when the org has access and the user can view it', () => {
    const member: User = { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true };
    const entries = resolveNav(derivePermissions(member, ['azure'], false));
    const cloudCosts = group(entries, 'cloud-costs');
    const azure = cloudCosts.children.find((leaf) => leaf.key === 'azure')!;
    const aws = cloudCosts.children.find((leaf) => leaf.key === 'aws')!;
    expect(azure.locked).toBe(false);
    expect(aws.locked).toBe(true);
  });

  it('locks Budgets & Alerts unless privileged or able to view Azure/AWS/BTP (GCP excluded, matching the reference app)', () => {
    const gcpOnlyMember: User = { id: '1', email: 'a@b.com', role: 'member', canViewGcp: true };
    const entries = resolveNav(derivePermissions(gcpOnlyMember, ['gcp'], false));
    expect(group(entries, 'governance').children[0].locked).toBe(true);

    const azureMember: User = { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true };
    const azureEntries = resolveNav(derivePermissions(azureMember, ['azure'], false));
    expect(group(azureEntries, 'governance').children[0].locked).toBe(false);
  });
});
