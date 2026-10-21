import { describe, expect, it } from 'vitest';
import { azureServiceCategoryOf, BUDGET_NEAR_THRESHOLD, budgetAlerts, summarizeAdvisor } from './azureDerivations';
import type { AzureAdvisorRecommendation } from './azureTypes';

describe('azureServiceCategoryOf', () => {
  it.each([
    ['Virtual Machines', 'Compute'],
    ['Azure Kubernetes Service', 'Compute'],
    ['App Service', 'Compute'],
    ['SQL Database', 'Databases'],
    ['Cosmos DB', 'Databases'],
    ['Redis Cache', 'Databases'],
    ['Storage Accounts', 'Storage'],
    ['Networking', 'Networking'],
    ['Azure DNS', 'Networking'],
    ['Something New', 'Other'],
  ])('puts %s under %s', (service, category) => {
    expect(azureServiceCategoryOf(service)).toBe(category);
  });
});

const advisor = (problem: string, impact: AzureAdvisorRecommendation['impact'], monthly: string, extra: Record<string, string> = {}): AzureAdvisorRecommendation => ({
  shortDescription: { problem, solution: `Fix ${problem}` },
  extendedProperties: { savingsAmount: monthly, ...extra },
  impact,
  category: 'Cost',
});

describe('summarizeAdvisor', () => {
  it('orders by impact, then by saving, and totals monthly and annual savings', () => {
    const summary = summarizeAdvisor([
      advisor('low one', 'Low', '10', { annualSavingsAmount: '120' }),
      advisor('high small', 'High', '100', { annualSavingsAmount: '1200' }),
      advisor('high big', 'High', '400', { annualSavingsAmount: '4800' }),
      advisor('medium', 'Medium', '50', { annualSavingsAmount: '600' }),
    ]);
    expect(summary.items.map((i) => i.problem)).toEqual(['high big', 'high small', 'medium', 'low one']);
    expect(summary.totalMonthly).toBe(560);
    expect(summary.totalAnnual).toBe(6720);
  });

  it('falls back to twelve times the monthly saving when there is no annual figure', () => {
    const summary = summarizeAdvisor([advisor('no annual', 'Low', '12.5')]);
    expect(summary.items[0].annualSaving).toBe(150);
  });

  it('reads the commitment term, and has none for advice without one', () => {
    const summary = summarizeAdvisor([advisor('one year', 'High', '5', { term: 'P1Y' }), advisor('three years', 'Medium', '5', { term: 'P3Y' }), advisor('none', 'Low', '5')]);
    expect(summary.items.map((i) => i.term)).toEqual(['1 year', '3 years', null]);
  });

  it('treats a missing or unreadable saving as zero', () => {
    const summary = summarizeAdvisor([{ ...advisor('odd', 'Low', 'n/a'), extendedProperties: {} }]);
    expect(summary.items[0].monthlySaving).toBe(0);
    expect(summarizeAdvisor([])).toEqual({ items: [], totalMonthly: 0, totalAnnual: 0 });
  });
});

describe('budgetAlerts', () => {
  const budget = (name: string, amount: number, spent: number) => ({ name, amount, currentSpend: { amount: spent } });

  it('lists budgets that are over or near their cap, most urgent first, and counts the rest as healthy', () => {
    const summary = budgetAlerts([
      budget('Healthy', 1000, 300),
      budget('Near', 1000, 790),
      budget('Over', 1000, 1250),
      budget('Exactly at cap', 1000, 1000),
    ]);
    expect(summary.rows.map((r) => [r.name, r.status, r.pct])).toEqual([
      ['Over', 'over', 125],
      ['Exactly at cap', 'over', 100],
      ['Near', 'near', 79],
    ]);
    expect(summary.healthy).toBe(1);
  });

  it('uses 75% as the near threshold', () => {
    expect(BUDGET_NEAR_THRESHOLD).toBe(0.75);
    expect(budgetAlerts([budget('At 75', 100, 75)]).rows[0].status).toBe('near');
    expect(budgetAlerts([budget('At 74', 100, 74)]).rows).toEqual([]);
  });

  it('ignores budgets without a cap', () => {
    expect(budgetAlerts([budget('No cap', 0, 500)])).toEqual({ rows: [], healthy: 0 });
  });

  it('is empty without budgets', () => {
    expect(budgetAlerts([])).toEqual({ rows: [], healthy: 0 });
  });
});
