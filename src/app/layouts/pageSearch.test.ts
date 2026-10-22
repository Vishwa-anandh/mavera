import { describe, it, expect } from 'vitest';
import { buildPageIndex, searchPages } from './pageSearch';
import { resolveNav } from '../router/navConfig';
import { derivePermissions } from '../../shared/lib/permissions';
import type { User } from '../../shared/types/auth';

const admin: User = { id: '1', email: 'a@b.com', role: 'admin' };
const index = buildPageIndex(resolveNav(derivePermissions(admin, ['azure', 'aws', 'btp', 'gcp'], false)));
const labels = (query: string) => searchPages(index, query).map((page) => page.label);

describe('page search', () => {
  it('finds pages by name, ranking name matches first', () => {
    expect(labels('budget')[0]).toBe('Budgets & Alerts');
    expect(labels('budget')).toContain('Budgets & Alerts');
  });

  it('matches SAP transaction codes and plain-language keywords', () => {
    expect(labels('st22')).toEqual(['Jobs & Dumps']);
    expect(labels('sm37')).toEqual(['Jobs & Dumps']);
    expect(labels('invoice')).toEqual(expect.arrayContaining(['Billing']));
  });

  it('offers the Setup guide to people who can manage users, by name and by "getting started"', () => {
    expect(labels('setup guide')).toContain('Setup guide');
    expect(searchPages(index, 'getting started').find((p) => p.path === '/setup')).toMatchObject({ label: 'Setup guide', where: 'Your organisation' });
    const member: User = { id: '2', email: 'm@b.com', role: 'member' };
    const noUsers = buildPageIndex(resolveNav(derivePermissions(member, [], false)), (module) => module !== 'users');
    expect(searchPages(noUsers, 'setup guide')).toEqual([]);
  });

  it('finds merged pages by the names of the pages they replaced', () => {
    expect(labels('system health')).toEqual(['SAP Overview']);
    expect(labels('recommendations')).toEqual(['Savings & Optimization']);
    expect(labels('reports')).toContain('Cost Analytics');
  });

  it('requires every word and says where the page lives', () => {
    const [result] = searchPages(index, 'sap transports');
    expect(result.label).toBe('Transport Management');
    expect(result.where).toBe('SAP Monitoring › Operations');
    expect(labels('nothing-matches-this')).toEqual([]);
  });

  it('includes profile pages, and only pages the user can reach', () => {
    expect(labels('subscription')).toContain('Subscription');
    const member: User = { id: '2', email: 'm@b.com', role: 'member' };
    const memberIndex = buildPageIndex(resolveNav(derivePermissions(member, [], false)));
    expect(searchPages(memberIndex, 'user management')).toEqual([]);
  });

  it('finds All Alerts, Invoices and the AI Assistant in the menus they now sit in, with where to find them', () => {
    expect(searchPages(index, 'alerts').find((p) => p.path === '/alerts')).toMatchObject({ label: 'All Alerts', where: 'Cloud Cost › Governance' });
    expect(searchPages(index, 'invoices').find((p) => p.path === '/invoices')).toMatchObject({ label: 'Invoices', where: 'Cloud Cost › Billing & reports' });
    expect(searchPages(index, 'assistant').find((p) => p.path === '/ai-assistant')).toMatchObject({ label: 'AI Assistant', where: 'Across modules' });
    expect(labels('copilot')).toContain('AI Assistant');
    expect(labels('upload bill')).toContain('Invoices');
  });

  it('keeps All alerts and the AI Assistant searchable when Cloud Cost is not subscribed (they fall back to the extras)', () => {
    const entries = resolveNav(derivePermissions(admin, ['azure'], false), {
      features: { budgets: true, smartAlerts: true, syncLogs: true, recommendations: true, cloudManagement: true, invoices: true },
      invoiceOnly: false,
      modules: { cloudCost: false, sapMonitoring: true },
    });
    const noCloud = buildPageIndex(entries);
    expect(searchPages(noCloud, 'alerts').map((p) => p.path)).toContain('/alerts');
    expect(searchPages(noCloud, 'invoices').map((p) => p.path)).not.toContain('/invoices');
  });

  it('returns nothing for an empty query', () => {
    expect(searchPages(index, '   ')).toEqual([]);
  });
});

describe('page search and role-based access', () => {
  it('lists Audit Trail, found by name and by plain-language words', () => {
    expect(labels('audit trail')).toEqual(['Audit Trail']);
    expect(searchPages(index, 'audit')[0]).toMatchObject({ path: '/audit-trail', where: 'Administration' });
    expect(labels('who did what')).toContain('Audit Trail');
  });

  it('drops pages the role cannot view, including the extras outside the menus', () => {
    const canView = (m: string) => m !== 'audit' && m !== 'subscription';
    const entries = resolveNav(derivePermissions(admin, ['azure'], false), {
      features: { budgets: true, smartAlerts: true, syncLogs: true, recommendations: true, cloudManagement: true, invoices: true },
      invoiceOnly: false,
      modules: { cloudCost: true, sapMonitoring: true },
      canView,
    });
    const restricted = buildPageIndex(entries, canView);
    expect(searchPages(restricted, 'audit trail')).toEqual([]);
    expect(searchPages(restricted, 'subscription').map((p) => p.path)).not.toContain('/subscription');
    expect(searchPages(index, 'subscription').map((p) => p.path)).toContain('/subscription');
    expect(searchPages(restricted, 'account').map((p) => p.label)).toEqual(['Account']);
  });
});
