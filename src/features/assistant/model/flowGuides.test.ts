import { describe, it, expect } from 'vitest';
import { FLOW_GUIDES, flowGuideForPath } from './flowGuides';

describe('flow guides', () => {
  it('has unique keys and every guide has a tour with at least one step', () => {
    const keys = FLOW_GUIDES.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const g of FLOW_GUIDES) {
      expect(g.steps.length, g.key).toBeGreaterThan(0);
      for (const step of g.steps) {
        expect(step.title, g.key).toBeTruthy();
        expect(step.body, g.key).toBeTruthy();
        expect(step.target, `${g.key}: ${step.title}`).toMatch(/^(css|btn|panel):.+/);
      }
    }
  });

  it('gives every guide a written reply, so the chat is useful even without the on-page tour', () => {
    for (const g of FLOW_GUIDES) expect(g.reply.length, g.key).toBeGreaterThan(40);
  });

  it('picks the most specific guide for a path, and the dashboard guide only for "/"', () => {
    expect(flowGuideForPath('/')?.key).toBe('dashboard');
    expect(flowGuideForPath('/sap/systems')?.key).toBe('sap-overview');
    expect(flowGuideForPath('/sap/databases')?.key).toBe('sap-hana');
    expect(flowGuideForPath('/aws')?.key).toBe('aws-overview');
    expect(flowGuideForPath('/aws/accounts')?.key).toBe('aws-accounts');
    expect(flowGuideForPath('/aws/account/aws-acc-1')?.key).toBe('aws-account');
    expect(flowGuideForPath('/azure/az-acc-1')?.key).toBe('azure-account');
    expect(flowGuideForPath('/alerts')?.key).toBe('alerts');
    expect(flowGuideForPath('/sap/alerts')?.key).toBe('sap-alerts');
    expect(flowGuideForPath('/nowhere')).toBeUndefined();
  });

  it('covers every member page that has content to explain', () => {
    const pages = [
      '/cloud/overview', '/cloud/analytics', '/cloud/optimization', '/cloud/reservations', '/cloud/resources',
      '/budgets', '/smart-alerts', '/invoices', '/billing',
      '/sap/systems', '/sap/databases', '/sap/performance', '/sap/jobs', '/sap/alerts',
      '/sap/transport-management', '/sap/security-notes', '/sap/btp-security', '/sap/configuration',
      '/alerts', '/users', '/sync-logs', '/account', '/subscription',
      '/azure', '/aws', '/gcp', '/btp',
    ];
    for (const path of pages) expect(flowGuideForPath(path), path).toBeDefined();
  });

  it('offers task tours on pages with several tasks, each with valid steps', () => {
    const users = flowGuideForPath('/users')!;
    expect(users.flows?.map((f) => f.label)).toEqual(['Add a user', 'Deactivate or reactivate a user', 'Change who can see what']);
    for (const g of FLOW_GUIDES) {
      const keys = (g.flows ?? []).map((f) => f.key);
      expect(new Set(keys).size, g.key).toBe(keys.length);
      for (const flow of g.flows ?? []) {
        expect(flow.steps.length, `${g.key}/${flow.key}`).toBeGreaterThan(0);
        for (const step of flow.steps) expect(step.target).toMatch(/^(css|btn|panel):.+/);
      }
    }
  });
});
