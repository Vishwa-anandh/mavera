import { describe, expect, it } from 'vitest';
import { derivePermissions } from '../../shared/lib/permissions';
import type { User } from '../../shared/types/auth';
import { resolveNav, type NavContext } from './navConfig';
import { appPaths, isRegisteredPath, routeById, routeManifest } from './route-manifest';

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
