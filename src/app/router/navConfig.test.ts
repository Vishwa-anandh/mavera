import { describe, it, expect } from 'vitest';
import { isNavPathActive, navColumnLayout, navMenuColumns, navSections, resolveNav, type NavContext, type ResolvedNavEntry } from './navConfig';
import { derivePermissions } from '../../shared/lib/permissions';
import type { User } from '../../shared/types/auth';

const ALL_ON: NavContext['features'] = {
  budgets: true,
  smartAlerts: true,
  syncLogs: true,
  recommendations: true,
  cloudManagement: true,
  invoices: true,
};

const ALL_MODULES_ON: NavContext['modules'] = { cloudCost: true, sapMonitoring: true };

function ctx(
  overrides: Partial<NavContext['features']> = {},
  invoiceOnly = false,
  moduleOverrides: Partial<NavContext['modules']> = {},
): NavContext {
  return { features: { ...ALL_ON, ...overrides }, invoiceOnly, modules: { ...ALL_MODULES_ON, ...moduleOverrides } };
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

  it('shows SAP Monitoring and Cloud Cost by default (org subscribed to both modules)', () => {
    const member: User = { id: '1', email: 'a@b.com', role: 'member' };
    const entries = resolveNav(derivePermissions(member, [], false));
    expect(entries.find((e) => e.key === 'sap')).toBeDefined();
    expect(entries.find((e) => e.key === 'cloud-cost')).toBeDefined();
  });

  it('places Billing inside Cloud Cost; Reports is no longer a page of its own', () => {
    const member: User = { id: '1', email: 'a@b.com', role: 'member' };
    const entries = resolveNav(derivePermissions(member, [], false));
    expect(entries.find((e) => e.key === 'billing')).toBeUndefined();
    const cloud = entries.find((e) => e.key === 'cloud-cost');
    expect(cloud?.type).toBe('group');
    const children = cloud?.type === 'group' ? cloud.children : [];
    expect(children.find((c) => c.key === 'billing')).toMatchObject({ path: '/billing', locked: false });
    // Reports was an empty placeholder; exporting now lives on Cost Analytics.
    expect(leaf(entries, 'reports')).toBeUndefined();
  });

  it('keeps Billing for an invoice-only org and hides it when Cloud Cost is not subscribed', () => {
    const member: User = { id: '1', email: 'a@b.com', role: 'member' };
    const permissions = derivePermissions(member, [], true);
    expect(leaf(resolveNav(permissions, ctx({}, true)), 'billing')).toBeDefined();
    const cloudOff = resolveNav(permissions, ctx({}, false, { cloudCost: false }));
    expect(leaf(cloudOff, 'billing')).toBeUndefined();
  });

  it('merges duplicate pages: one entry each for SAP Overview, Jobs & Dumps and Savings & Optimization', () => {
    const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };
    const entries = resolveNav(derivePermissions(admin, ['azure'], false), ctx());
    expect(leaf(entries, 'sap-systems')).toMatchObject({ label: 'SAP Overview', path: '/sap/systems' });
    expect(leaf(entries, 'sap-jobs')).toMatchObject({ label: 'Jobs & Dumps', path: '/sap/jobs' });
    expect(leaf(entries, 'cloud-optimization')).toMatchObject({ label: 'Savings & Optimization', path: '/cloud/optimization' });
    ['sap-health', 'sap-dumps', 'recommendations', 'reports'].forEach((key) => expect(leaf(entries, key)).toBeUndefined());
  });

  it("hides a module's entire nav group when the super admin hasn't subscribed the org to it", () => {
    const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };
    const permissions = derivePermissions(admin, ['azure'], false);

    const sapOff = resolveNav(permissions, ctx({}, false, { sapMonitoring: false }));
    expect(sapOff.find((e) => e.key === 'sap')).toBeUndefined();
    expect(sapOff.find((e) => e.key === 'cloud-cost')).toBeDefined();

    const cloudCostOff = resolveNav(permissions, ctx({}, false, { cloudCost: false }));
    expect(cloudCostOff.find((e) => e.key === 'cloud-cost')).toBeUndefined();
  });

  it('uses "Cloud Cost Monitoring" as the dropdown title while the trigger label stays "Cloud Cost"', () => {
    const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };
    const entries = resolveNav(derivePermissions(admin, ['azure'], false));
    const cloudCost = entries.find((e) => e.key === 'cloud-cost');
    expect(cloudCost?.type).toBe('group');
    if (cloudCost?.type === 'group') {
      expect(cloudCost.label).toBe('Cloud Cost');
      expect(cloudCost.menuTitle).toBe('Cloud Cost Monitoring');
    }
  });

  it('locks every cloud provider for a member with no org cloud access, without throwing', () => {
    const member: User = { id: '1', email: 'a@b.com', role: 'member' };
    expect(() => resolveNav(derivePermissions(member, [], false))).not.toThrow();
    const entries = resolveNav(derivePermissions(member, [], false));
    ['azure', 'aws', 'btp', 'gcp'].forEach((key) => expect(leaf(entries, key)?.locked).toBe(true));
  });

  it('unlocks a cloud provider only when the org has access and the user can view it', () => {
    const member: User = { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true };
    const entries = resolveNav(derivePermissions(member, ['azure'], false));
    expect(leaf(entries, 'azure')?.locked).toBe(false);
    expect(leaf(entries, 'aws')?.locked).toBe(true);
  });

  it('locks Budgets & Alerts unless privileged or able to view Azure/AWS/BTP (GCP excluded, matching the reference app)', () => {
    const gcpOnlyMember: User = { id: '1', email: 'a@b.com', role: 'member', canViewGcp: true };
    const entries = resolveNav(derivePermissions(gcpOnlyMember, ['gcp'], false));
    expect(leaf(entries, 'budgets')?.locked).toBe(true);

    const azureMember: User = { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true };
    const azureEntries = resolveNav(derivePermissions(azureMember, ['azure'], false));
    expect(leaf(azureEntries, 'budgets')?.locked).toBe(false);
  });

  // Reference components/Sidebar.jsx gates these on user.features.*.
  it('locks Smart Alerts, Budgets and Sync Logs when their subscription feature is off', () => {
    const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };
    const permissions = derivePermissions(admin, ['azure'], false);

    const allOn = resolveNav(permissions, ctx());
    ['smart-alerts', 'budgets', 'sync-logs'].forEach((key) =>
      expect(leaf(allOn, key)?.locked).toBe(false),
    );

    const allOff = resolveNav(
      permissions,
      ctx({ recommendations: false, smartAlerts: false, budgets: false, syncLogs: false }),
    );
    ['smart-alerts', 'budgets', 'sync-logs'].forEach((key) =>
      expect(leaf(allOff, key)?.locked).toBe(true),
    );
  });

  it('locks only the feature that is turned off', () => {
    const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };
    const entries = resolveNav(derivePermissions(admin, ['azure'], false), ctx({ smartAlerts: false }));
    expect(leaf(entries, 'smart-alerts')?.locked).toBe(true);
    expect(leaf(entries, 'sync-logs')?.locked).toBe(false);
    expect(leaf(entries, 'budgets')?.locked).toBe(false);
  });

  it('shows Invoices only for invoice-only or hybrid orgs', () => {
    const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };

    const cloudOrg = resolveNav(derivePermissions(admin, ['azure'], false), ctx());
    expect(leaf(cloudOrg, 'invoices')).toBeUndefined();

    const invoiceOrg = resolveNav(derivePermissions(admin, [], true), ctx({}, true));
    expect(leaf(invoiceOrg, 'invoices')).toBeDefined();

    const hybridOrg = resolveNav(derivePermissions(admin, ['aws'], true), ctx({}, true));
    expect(leaf(hybridOrg, 'invoices')).toBeDefined();
  });

  it('hides true cloud-resource destinations for a pure invoice-only org, but keeps them for a hybrid org', () => {
    const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };

    const invoiceOrg = resolveNav(derivePermissions(admin, [], true), ctx({}, true));
    expect(leaf(invoiceOrg, 'azure')).toBeUndefined();
    expect(leaf(invoiceOrg, 'cloud-overview')).toBeUndefined();
    expect(leaf(invoiceOrg, 'invoices')).toBeDefined();
    // Subscription-feature items aren't cloud-resource dependent, so they stay.
    expect(leaf(invoiceOrg, 'budgets')).toBeDefined();

    const hybridOrg = resolveNav(derivePermissions(admin, ['aws'], true), ctx({}, true));
    expect(leaf(hybridOrg, 'aws')).toBeDefined();
    expect(leaf(hybridOrg, 'cloud-overview')).toBeDefined();
  });
});

function group(entries: ResolvedNavEntry[], key: string) {
  const found = entries.find((entry) => entry.type === 'group' && entry.key === key);
  if (!found || found.type !== 'group') throw new Error(`no group ${key}`);
  return found;
}

describe('dropdown sections', () => {
  const member: User = { id: '1', email: 'a@b.com', role: 'admin' };
  const nav = () => resolveNav(derivePermissions(member, ['azure', 'aws', 'btp', 'gcp'], false), ctx());

  it('groups each module menu into ordered, labelled sections', () => {
    expect(navSections(group(nav(), 'sap').children).map((s) => s.label)).toEqual(['Systems', 'Operations', 'Security', 'Settings']);
    expect(navSections(group(nav(), 'cloud-cost').children).map((s) => s.label)).toEqual(['Overview', 'Cloud providers', 'Optimization', 'Governance', 'Billing & reports']);
  });

  it('keeps Administration as one unlabelled list and leaves Invoice Builder to the super admin portal', () => {
    const admin = navSections(group(nav(), 'administration').children);
    expect(admin).toHaveLength(1);
    expect(admin[0].label).toBeUndefined();
    expect(leaf(nav(), 'invoice-builder')).toBeUndefined();
  });

  it('drops a section whose items are all hidden', () => {
    const invoiceOnly = resolveNav(derivePermissions(member, [], true), ctx({}, true));
    const labels = navSections(group(invoiceOnly, 'cloud-cost').children).map((s) => s.label);
    expect(labels).not.toContain('Cloud providers');
    expect(labels).toContain('Billing & reports');
  });

  it('lays big menus out in balanced columns and short ones as a single list', () => {
    const cloud = group(nav(), 'cloud-cost').children;
    // Merging pages shortened the Cloud Cost menu, so it now fits two balanced columns.
    expect(navMenuColumns(cloud)).toBe(2);
    const columns = navColumnLayout(navSections(cloud), 2).map((col) => col.map((s) => s.label));
    expect(columns).toHaveLength(2);
    expect(columns.flat()).toEqual(['Overview', 'Cloud providers', 'Optimization', 'Governance', 'Billing & reports']);
    expect(navMenuColumns(group(nav(), 'administration').children)).toBe(1);
  });
});

describe('isNavPathActive', () => {
  it('matches a page and the pages beneath it, but the dashboard only matches itself', () => {
    expect(isNavPathActive('/azure', '/azure')).toBe(true);
    expect(isNavPathActive('/azure', '/azure/sub-123')).toBe(true);
    expect(isNavPathActive('/azure', '/azure-extra')).toBe(false);
    expect(isNavPathActive('/', '/')).toBe(true);
    expect(isNavPathActive('/', '/billing')).toBe(false);
  });
});
