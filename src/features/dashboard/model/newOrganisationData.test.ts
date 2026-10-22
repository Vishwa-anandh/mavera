import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { workspaceRepository } from '../../../data-access';
import { newOrganisationData } from './newOrganisationData';
import { activeAlertCountOf, budgetCountOf, forecastEomOf, monthlyByProviderOf, mspSavingsTotalOf, providerTotalsOf, recommendationCountOf, totalAccountsOf, totalSpendOf } from './useDashboardData';

describe('newOrganisationData (the dashboard of a brand-new organisation)', () => {
  beforeEach(() => workspaceRepository.setProfile('empty'));
  afterEach(() => workspaceRepository.setProfile('populated'));

  it('is all zeros and no history while nothing is connected', () => {
    const data = newOrganisationData([]);
    expect(totalSpendOf(data.summary.data)).toBe(0);
    expect(totalAccountsOf(data.summary.data)).toBe(0);
    expect(monthlyByProviderOf(data.summary.data)).toEqual([]);
    expect(forecastEomOf(data.summary.data)).toBeNull();
    expect(recommendationCountOf(data.recommendations.data)).toBe(0);
    expect(activeAlertCountOf(data.smartAlerts.data)).toBe(0);
    expect(budgetCountOf(data.budgets.data)).toBe(0);
    expect(mspSavingsTotalOf(data.mspSavings.data)).toBe(0);
    expect(JSON.stringify(data)).not.toMatch(/NaN|undefined/);
  });

  it('builds every figure from the accounts it has connected, and only those', () => {
    workspaceRepository.addConnectedAccount('azure', { name: 'Contoso', subscriptionId: 's', tenantId: 't', clientId: 'c' });
    const data = newOrganisationData([]);
    const [azure] = workspaceRepository.sampleSpend();
    expect(providerTotalsOf(data.summary.data)).toEqual({ azure: azure.total, aws: 0, btp: 0, gcp: 0 });
    expect(totalSpendOf(data.summary.data)).toBe(azure.total);
    expect(totalAccountsOf(data.summary.data)).toBe(1);
    // The current month of the history is what the connected accounts spend now.
    const months = monthlyByProviderOf(data.summary.data);
    expect(months[months.length - 1]).toMatchObject({ azure: azure.total, aws: 0 });
    expect(forecastEomOf(data.summary.data)).toBeGreaterThan(azure.total);
    expect(recommendationCountOf(data.recommendations.data)).toBeGreaterThan(0);
    expect(activeAlertCountOf(data.smartAlerts.data)).toBeGreaterThan(0);
    expect(mspSavingsTotalOf(data.mspSavings.data)).toBeGreaterThan(0);
    expect(JSON.stringify(data)).not.toMatch(/NaN|undefined/);
  });
});
