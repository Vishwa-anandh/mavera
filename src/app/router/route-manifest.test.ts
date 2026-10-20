import { describe, expect, it } from 'vitest';
import { derivePermissions } from '../../shared/lib/permissions';
import type { User } from '../../shared/types/auth';
import { NAV_MODULES, resolveNav, type NavContext } from './navConfig';
import { appPaths, isRegisteredPath, productModuleFor, routeById, routeManifest, routeModuleFor } from './route-manifest';

const ALL_ON: NavContext = {
  features: { budgets: true, smartAlerts: true, syncLogs: true, recommendations: true, cloudManagement: true, invoices: true },
  invoiceOnly: false,
  modules: { cloudCost: true, sapMonitoring: true },
};

function navigationPaths(): string[] {
  const admin: User = { id: '1', email: 'admin@example.com', role: 'admin' };
  const paths = new Set<string>();
  // Two resolutions: cloud-account org (Invoices hidden) and invoice-only org (cloud views hidden).
  for (const invoiceOnly of [false, true]) {
    for (const entry of resolveNav(derivePermissions(admin, [], false), { ...ALL_ON, invoiceOnly })) {
      if (entry.type === 'leaf') paths.add(entry.path);
      else entry.children.forEach((child) => paths.add(child.path));
    }
  }
  return [...paths];
}

describe('route manifest', () => {
  it('has unique route ids and unique paths', () => {
    const ids = routeManifest.map((route) => route.id);
    const paths = routeManifest.map((route) => route.path);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('registers every path in appPaths, and nothing else', () => {
    expect(new Set(routeManifest.map((route) => route.path))).toEqual(new Set(Object.values(appPaths)));
  });

  it('serves every navigation destination with a registered route', () => {
    const missing = navigationPaths().filter((path) => !isRegisteredPath(path));
    expect(missing).toEqual([]);
  });

  it('serves the former placeholder destinations as real member pages in the app layout', () => {
    for (const key of ['cloudAnalytics', 'cloudOptimization', 'cloudReservations', 'cloudResources', 'account'] as const) {
      const route = routeManifest.find((item) => item.path === appPaths[key]);
      expect(route, `${key} is missing from the manifest`).toBeDefined();
      expect(route?.access.kind).toBe('authenticated');
      expect(route?.layout).toBe('app');
    }
  });

  it('puts super-admin routes in the admin layout and only those', () => {
    for (const route of routeManifest) {
      expect(route.access.kind === 'super-admin', `${route.id}`).toBe(route.layout === 'admin');
    }
  });

  it('throws for an unknown route id', () => {
    expect(() => routeById('does-not-exist')).toThrow('Unknown route id');
  });
});

describe('role-based route protection', () => {
  it('guards every navigation destination with the same module the menu uses', () => {
    const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };
    const entries = resolveNav(derivePermissions(admin, ['azure', 'aws', 'btp', 'gcp'], false), ALL_ON);
    let checked = 0;
    for (const entry of entries) {
      const leaves = entry.type === 'leaf' ? [entry] : entry.children;
      for (const item of leaves) {
        const module = NAV_MODULES[item.key];
        if (!module) continue;
        expect(routeModuleFor(item.path), `${item.key} -> ${item.path}`).toBe(module);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('maps parameterised and splat routes, redirects and the new Audit Trail', () => {
    expect(routeModuleFor('/audit-trail')).toBe('audit');
    expect(routeModuleFor('/azure/sub-123')).toBe('provider.azure');
    expect(routeModuleFor('/aws/accounts/1')).toBe('provider.aws');
    expect(routeModuleFor('/sap/dumps')).toBe('sap.jobs');
    expect(routeModuleFor('/')).toBe('dashboard');
    expect(routeModuleFor('/users/')).toBe('users');
  });

  it('leaves pages that every signed-in member may open without a module', () => {
    expect(routeModuleFor('/account')).toBeUndefined();
    expect(routeModuleFor('/alerts')).toBeUndefined();
    expect(routeModuleFor('/nowhere')).toBeUndefined();
    expect(routeById('audit-trail')).toMatchObject({ path: '/audit-trail', module: 'audit', layout: 'app' });
  });
});

describe('productModuleFor', () => {
  it('ties SAP pages to SAP Monitoring and cost, provider, budget and invoice pages to Cloud Cost', () => {
    for (const path of ['/sap/systems', '/sap/databases', '/sap/jobs', '/sap/dumps', '/sap/transport-management', '/sap/configuration']) {
      expect(productModuleFor(path), path).toBe('sapMonitoring');
    }
    for (const path of ['/cloud/overview', '/cloud/optimization', '/azure', '/azure/some-id', '/aws/accounts', '/budgets', '/smart-alerts', '/invoices']) {
      expect(productModuleFor(path), path).toBe('cloudCost');
    }
  });

  it('leaves shared pages open to every organisation', () => {
    for (const path of ['/', '/account', '/users', '/subscription', '/audit-trail', '/alerts', '/ai-assistant']) {
      expect(productModuleFor(path), path).toBeUndefined();
    }
  });
});
