import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { accessRepository } from './accessRepository';
import { activityRepository } from './activityRepository';
import { budgetsRepository } from './budgetsRepository';
import { cloudInsightsRepository } from './cloudInsightsRepository';
import { cloudSamplesRepository } from './cloudSamplesRepository';
import { invoicesRepository } from './invoicesRepository';
import { sapAdminRepository } from './sapAdminRepository';
import { sapRepository } from './sapRepository';
import { smartAlertsRepository } from './smartAlertsRepository';
import { getWorkspaceProfile } from './workspaceProfile';
import { workspaceRepository } from './workspaceRepository';

const azureInput = { name: 'Contoso Prod', subscriptionId: '11111111-2222-4333-8444-555555555555', tenantId: '66666666-7777-4888-9999-000000000000', clientId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' };

afterEach(() => workspaceRepository.setProfile('populated'));

describe('workspaceRepository: populated profile (today\'s sample organisation)', () => {
  beforeEach(() => workspaceRepository.setProfile('populated'));

  it('starts with the sample accounts of every provider, none flagged as sample data', () => {
    expect(workspaceRepository.getProfile()).toBe('populated');
    expect(workspaceRepository.listAccounts('azure').map((a) => a.id)).toEqual(['az-acc-1', 'az-acc-2']);
    expect(workspaceRepository.listAccounts('aws')).toHaveLength(2);
    expect(workspaceRepository.listAccounts('gcp')).toHaveLength(2);
    expect(workspaceRepository.listAccounts('btp')).toHaveLength(2);
    expect(workspaceRepository.connectedProviders()).toEqual(['azure', 'aws', 'gcp', 'btp']);
    expect(workspaceRepository.listAccounts('azure').some((a) => a.sample)).toBe(false);
  });

  it('keeps every other store at its seed: budgets, alerts, invoices, SAP landscape and members', () => {
    expect(budgetsRepository.listBudgets()).toHaveLength(3);
    expect(smartAlertsRepository.list().length).toBeGreaterThan(20);
    expect(invoicesRepository.list().length).toBeGreaterThan(0);
    expect(sapAdminRepository.destinations.list()).toHaveLength(6);
    expect(sapRepository.isConnected()).toBe(true);
    expect(sapRepository.listSystems().length).toBeGreaterThan(0);
    expect(accessRepository.getSnapshot().members.length).toBeGreaterThan(1);
    expect(cloudInsightsRepository.getCostAnalytics().monthly.some((m) => m.provider === 'gcp')).toBe(true);
  });

  it('hands out copies', () => {
    workspaceRepository.listAccounts('azure')[0].name = 'Changed';
    expect(workspaceRepository.listAccounts('azure')[0].name).toBe('Production Environment');
  });
});

describe('workspaceRepository: empty profile (a brand-new organisation)', () => {
  beforeEach(() => workspaceRepository.setProfile('empty'));

  it('starts with nothing connected and nothing in any store', () => {
    expect(workspaceRepository.getProfile()).toBe('empty');
    expect(workspaceRepository.accountCount()).toBe(0);
    expect(workspaceRepository.connectedProviders()).toEqual([]);
    expect(workspaceRepository.sampleSpend()).toEqual([]);
    expect(budgetsRepository.listBudgets()).toEqual([]);
    expect(budgetsRepository.listChannels()).toEqual([]);
    expect(budgetsRepository.listCloudAccounts()).toEqual([]);
    expect(smartAlertsRepository.list()).toEqual([]);
    expect(smartAlertsRepository.listRecipients()).toEqual([]);
    expect(invoicesRepository.list()).toEqual([]);
    expect(sapAdminRepository.destinations.list()).toEqual([]);
    expect(sapAdminRepository.securityNotes.list()).toEqual([]);
    expect(sapAdminRepository.alerts.list()).toEqual([]);
    expect(sapAdminRepository.alerts.listRecipients()).toEqual([]);
    expect(sapAdminRepository.transport.getState().transports).toEqual([]);
    expect(accessRepository.getSnapshot()).toEqual({ customRoles: [], members: [] });
    expect(activityRepository.listAlerts()).toEqual([]);
    expect(activityRepository.listSyncLogs()).toEqual([]);
  });

  it('has no cloud data and no SAP landscape until something is connected', () => {
    const analytics = cloudInsightsRepository.getCostAnalytics();
    expect(analytics.monthly).toEqual([]);
    expect(analytics.accounts).toEqual([]);
    expect(cloudInsightsRepository.listResources()).toEqual([]);
    expect(cloudInsightsRepository.listReservations()).toEqual([]);
    expect(cloudInsightsRepository.listOptimizationOpportunities()).toEqual([]);
    expect(cloudInsightsRepository.getSavingsRealisation()).toEqual([]);
    expect(sapRepository.isConnected()).toBe(false);
    expect(sapRepository.listSystems()).toEqual([]);
    expect(sapRepository.listJobs()).toEqual([]);
    expect(sapRepository.listDumps()).toEqual([]);
    expect(sapRepository.listAlerts()).toEqual([]);
    expect(cloudSamplesRepository.recommendationInputs().spend).toEqual({ azure: 0, aws: 0, btp: 0, gcp: 0 });
  });

  it('adds a connected account with a generated id, flagged as sample data, and notifies subscribers', () => {
    const versions: number[] = [];
    const unsubscribe = workspaceRepository.subscribe(() => versions.push(workspaceRepository.getVersion()));
    const account = workspaceRepository.addConnectedAccount('azure', azureInput);
    unsubscribe();
    expect(account).toMatchObject({ id: 'az-acc-1', name: 'Contoso Prod', sample: true });
    expect(workspaceRepository.listAccounts('azure')).toEqual([account]);
    expect(workspaceRepository.connectedProviders()).toEqual(['azure']);
    expect(versions).toHaveLength(1);
  });

  it('never reuses the id of a removed account', () => {
    const first = workspaceRepository.addConnectedAccount('aws', { name: 'A', region: 'us-east-1', accessKey: 'AKIA0000000000000000' });
    expect(workspaceRepository.removeAccount('aws', first.id)).toBe(true);
    const second = workspaceRepository.addConnectedAccount('aws', { name: 'B', region: 'us-east-1', accessKey: 'AKIA1111111111111111' });
    expect(second.id).not.toBe(first.id);
    expect(workspaceRepository.removeAccount('aws', 'nope')).toBe(false);
  });

  it('renames an account, ignoring a blank name', () => {
    const account = workspaceRepository.addConnectedAccount('gcp', { name: 'Analytics', projectId: 'analytics-123' });
    workspaceRepository.renameAccount('gcp', account.id, '  Data platform  ');
    expect(workspaceRepository.getAccount('gcp', account.id)?.name).toBe('Data platform');
    workspaceRepository.renameAccount('gcp', account.id, '   ');
    expect(workspaceRepository.getAccount('gcp', account.id)?.name).toBe('Data platform');
  });

  it('lights up the data for what was connected, under the account\'s own name', () => {
    workspaceRepository.addConnectedAccount('azure', azureInput);
    const spend = workspaceRepository.sampleSpend();
    expect(spend).toHaveLength(1);
    expect(spend[0]).toMatchObject({ provider: 'azure', accounts: 1, currency: 'USD' });
    expect(spend[0].total).toBeGreaterThan(0);

    const [summary] = cloudSamplesRepository.azure.summaries(workspaceRepository.listAccounts('azure'));
    expect(summary).toMatchObject({ id: 'az-acc-1', name: 'Contoso Prod', subscriptionId: azureInput.subscriptionId, budgetStatus: null });
    expect(cloudSamplesRepository.azure.full(workspaceRepository.listAccounts('azure')[0]).billingMetadata?.name).toBe('Contoso Prod');

    // Only the connected provider appears in cross-provider data, labelled with the account's name.
    expect([...new Set(cloudInsightsRepository.getCostAnalytics().monthly.map((m) => m.provider))]).toEqual(['azure']);
    expect(cloudInsightsRepository.getCostAnalytics().accounts.map((a) => a.name)).toEqual(['Contoso Prod']);
    expect(cloudInsightsRepository.listResources().every((r) => r.provider === 'azure' && r.account === 'Contoso Prod')).toBe(true);
    expect(cloudInsightsRepository.listOptimizationOpportunities().length).toBeGreaterThan(0);
    expect(budgetsRepository.listCloudAccounts()).toEqual([{ id: 'az-acc-1', name: 'Azure - Contoso Prod', provider: 'azure' }]);
    expect(activityRepository.listSyncLogs().map((l) => l.accountName)).toEqual(['Contoso Prod']);
  });

  it('brings the provider\'s sample alerts with the first account, and drops them with it', () => {
    const account = workspaceRepository.addConnectedAccount('azure', azureInput);
    const alerts = smartAlertsRepository.list();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.every((a) => a.provider === 'azure' && a.account_id === account.id)).toBe(true);
    expect(activityRepository.listAlerts().length).toBeGreaterThan(0);
    workspaceRepository.removeAccount('azure', account.id);
    expect(smartAlertsRepository.list()).toEqual([]);
  });

  it('shows the SAP landscape once a destination is added, and hides it again when the last one goes', () => {
    const destination = sapAdminRepository.destinations.add({
      name: 'Prod', connectionType: 'ODATA', url: 'https://sap.example.com', systems: ['PRD'], timezone: 'UTC — UTC+0', client: '100', language: 'EN', username: 'svc',
    });
    expect(sapRepository.isConnected()).toBe(true);
    expect(sapRepository.listSystems().length).toBeGreaterThan(0);
    expect(sapAdminRepository.transport.getState().transports.length).toBeGreaterThan(0);
    expect(sapAdminRepository.alerts.list().length).toBeGreaterThan(0);
    sapAdminRepository.destinations.remove(destination.id);
    expect(sapRepository.isConnected()).toBe(false);
    expect(sapAdminRepository.alerts.list()).toEqual([]);
    expect(sapAdminRepository.transport.getState().stmsConnected).toBe(false);
  });

  it('derives the checklist from the stores and keeps only a dismissed flag and the tour step itself', () => {
    const steps = () => Object.fromEntries(workspaceRepository.onboarding().steps.map((s) => [s.id, s.done]));
    expect(steps()).toEqual({ cloud: false, sap: false, budget: false, alerts: false, teammate: false, tour: false });
    expect(workspaceRepository.onboarding()).toMatchObject({ doneCount: 0, dismissed: false });

    workspaceRepository.addConnectedAccount('azure', azureInput);
    budgetsRepository.createBudget({ name: 'Cap', target_amount: 1000, alert_threshold: 80, scope_type: 'organization', scope_value: '' });
    smartAlertsRepository.addRecipient('cost_threshold', 'finance@example.com');
    accessRepository.ensureMember({ userId: 'owner', fullName: 'Owner', email: 'owner@example.com', role: 'admin', roleId: 'owner', status: 'active', alertsEnabled: true, lastActiveAt: '2026-10-01T00:00:00.000Z' });
    expect(steps()).toMatchObject({ cloud: true, sap: false, budget: true, alerts: true, teammate: false });

    accessRepository.addMember({ userId: 'mate', fullName: 'Mate', email: 'mate@example.com', role: 'member', roleId: 'viewer', status: 'active', alertsEnabled: true, lastActiveAt: '2026-10-01T00:00:00.000Z' });
    workspaceRepository.markTourDone();
    workspaceRepository.dismissOnboarding();
    expect(steps()).toMatchObject({ teammate: true, tour: true });
    expect(workspaceRepository.onboarding()).toMatchObject({ doneCount: 5, dismissed: true, tourDone: true });
    workspaceRepository.dismissOnboarding(false);
    expect(workspaceRepository.onboarding().dismissed).toBe(false);
  });

  it('counts an email channel added on Budgets & Alerts as alert recipients, and reports the counts the coach watches', () => {
    expect(workspaceRepository.progressSignals()).toEqual({ accounts: 0, destinations: 0, budgets: 0, recipients: 0, members: 0 });
    budgetsRepository.addChannel({ provider: 'email', alert_scope: 'global', budget_ids: [], email_addresses: ['ops@example.com'], webhook_url: '' });
    expect(workspaceRepository.onboarding().steps.find((s) => s.id === 'alerts')?.done).toBe(true);
    expect(workspaceRepository.progressSignals().recipients).toBe(1);
    workspaceRepository.addConnectedAccount('azure', azureInput);
    expect(workspaceRepository.progressSignals().accounts).toBe(1);
  });

  it('reset() returns the organisation to its seed', () => {
    workspaceRepository.addConnectedAccount('azure', azureInput);
    budgetsRepository.createBudget({ name: 'Cap', target_amount: 1000, alert_threshold: 80, scope_type: 'organization', scope_value: '' });
    workspaceRepository.reset();
    expect(workspaceRepository.accountCount()).toBe(0);
    expect(budgetsRepository.listBudgets()).toEqual([]);
    expect(workspaceRepository.getProfile()).toBe('empty');
    // ids start over after a reset
    expect(workspaceRepository.addConnectedAccount('azure', azureInput).id).toBe('az-acc-1');
  });
});

describe('workspaceRepository: isolation between profiles', () => {
  it('one demo login never sees another\'s changes, and switching re-seeds even to the same profile', () => {
    workspaceRepository.setProfile('populated');
    workspaceRepository.removeAccount('azure', 'az-acc-1');
    budgetsRepository.deleteBudget('budget-1');
    expect(workspaceRepository.listAccounts('azure')).toHaveLength(1);

    workspaceRepository.setProfile('empty');
    workspaceRepository.addConnectedAccount('azure', azureInput);
    budgetsRepository.createBudget({ name: 'Mine', target_amount: 5, alert_threshold: 80, scope_type: 'organization', scope_value: '' });

    workspaceRepository.setProfile('populated');
    expect(getWorkspaceProfile()).toBe('populated');
    expect(workspaceRepository.listAccounts('azure').map((a) => a.id)).toEqual(['az-acc-1', 'az-acc-2']);
    expect(budgetsRepository.listBudgets().map((b) => b.id)).toEqual(['budget-1', 'budget-2', 'budget-3']);

    workspaceRepository.setProfile('empty');
    expect(workspaceRepository.accountCount()).toBe(0);
    expect(budgetsRepository.listBudgets()).toEqual([]);
  });
});
