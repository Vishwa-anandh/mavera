import { describe, it, expect } from 'vitest';
import { resolveNav, type NavContext, type ResolvedNavEntry } from './navConfig';
import { derivePermissions } from '../lib/permissions';
import type { User } from '../types/auth';

function group(entries: ResolvedNavEntry[], key: string) {
  const entry = entries.find((e) => e.key === key);
  if (!entry || entry.type !== 'group') throw new Error(`group ${key} not found`);
  return entry;
}

const ALL_ON: NavContext['features'] = {
  budgets: true,
  smartAlerts: true,
  syncLogs: true,
  recommendations: true,
  cloudManagement: true,
  invoices: true,
};

function ctx(overrides: Partial<NavContext['features']> = {}, invoiceOnly = false): NavContext {
  return { features: { ...ALL_ON, ...overrides }, invoiceOnly };
}

function leaf(entries: ResolvedNavEntry[], key: string) {
  for (const entry of entries) {
    if (entry.type === 'leaf' && entry.key === key) return entry;
    if (entry.type === 'group') {
      const found = entry.children.find((child) => child.key === key);
      if (found) return found;
    }
  }
  return undefined;
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

  // Reference components/Sidebar.jsx gates these on user.features.*.
  it('locks Recommendations, Smart Alerts, Budgets and Sync Logs when their subscription feature is off', () => {
    const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };
    const permissions = derivePermissions(admin, ['azure'], false);

    const allOn = resolveNav(permissions, ctx());
    ['recommendations', 'smart-alerts', 'budgets', 'sync-logs'].forEach((key) =>
      expect(leaf(allOn, key)?.locked).toBe(false),
    );

    const allOff = resolveNav(
      permissions,
      ctx({ recommendations: false, smartAlerts: false, budgets: false, syncLogs: false }),
    );
    ['recommendations', 'smart-alerts', 'budgets', 'sync-logs'].forEach((key) =>
      expect(leaf(allOff, key)?.locked).toBe(true),
    );
  });

  it('locks only the feature that is turned off', () => {
    const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };
    const entries = resolveNav(derivePermissions(admin, ['azure'], false), ctx({ smartAlerts: false }));
    expect(leaf(entries, 'smart-alerts')?.locked).toBe(true);
    expect(leaf(entries, 'recommendations')?.locked).toBe(false);
    expect(leaf(entries, 'budgets')?.locked).toBe(false);
  });

  it('shows Invoices only for invoice-only or hybrid orgs', () => {
    const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };

    const cloudOrg = resolveNav(derivePermissions(admin, ['azure'], false), ctx());
    expect(leaf(cloudOrg, 'invoices')).toBeUndefined();
    expect(cloudOrg.find((e) => e.key === 'operations')).toBeUndefined();

    const invoiceOrg = resolveNav(derivePermissions(admin, [], true), ctx({}, true));
    expect(leaf(invoiceOrg, 'invoices')).toBeDefined();

    const hybridOrg = resolveNav(derivePermissions(admin, ['aws'], true), ctx({}, true));
    expect(leaf(hybridOrg, 'invoices')).toBeDefined();
  });

  it('hides cloud nav entirely for a pure invoice-only org, but keeps it for a hybrid org', () => {
    const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };

    const invoiceOrg = resolveNav(derivePermissions(admin, [], true), ctx({}, true));
    expect(invoiceOrg.find((e) => e.key === 'cloud-costs')).toBeUndefined();

    const hybridOrg = resolveNav(derivePermissions(admin, ['aws'], true), ctx({}, true));
    expect(hybridOrg.find((e) => e.key === 'cloud-costs')).toBeDefined();
  });
});
