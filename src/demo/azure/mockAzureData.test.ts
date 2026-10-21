import { describe, expect, it } from 'vitest';
import { extendDailyHistory, groupByCategory } from '../../shared/lib/costAnalysis';
import { azureServiceCategoryOf, budgetAlerts } from '../../features/azure/model/azureDerivations';
import { MOCK_AZURE_FULL, MOCK_AZURE_YEARLY } from './mockAzureData';

const sum = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;

describe('Azure sample data is internally consistent', () => {
  const { costs } = MOCK_AZURE_FULL;

  it('daily costs add up to the month-to-date total, and so do the services', () => {
    expect(sum(costs.dailyCosts.map((d) => d.cost))).toBeCloseTo(costs.totalCost, 2);
    expect(sum(costs.services.map((s) => s.cost))).toBeCloseTo(costs.totalCost, 2);
  });

  it('every stored month sums its daily costs and its services to its total', () => {
    expect(MOCK_AZURE_YEARLY).toHaveLength(12);
    for (const month of MOCK_AZURE_YEARLY) {
      expect(sum(month.dailyCosts.map((d) => d.cost)), `${month.year}-${month.month} daily`).toBeCloseTo(month.totalCost, 2);
      expect(sum(month.topServices.map((s) => s.cost)), `${month.year}-${month.month} services`).toBeCloseTo(month.totalCost, 2);
    }
  });

  it('the current month is the last stored month', () => {
    expect(MOCK_AZURE_YEARLY[MOCK_AZURE_YEARLY.length - 1].totalCost).toBe(costs.totalCost);
  });

  it('has at least 30 days of daily history once the end of the previous month is added', () => {
    const history = extendDailyHistory(costs.dailyCosts, MOCK_AZURE_YEARLY);
    expect(history.length).toBeGreaterThanOrEqual(30);
    const dates = history.map((d) => d.date);
    expect([...dates].sort()).toEqual(dates);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('category shares add up to 100% and every service lands in a named category', () => {
    const summary = groupByCategory(costs.services, azureServiceCategoryOf);
    expect(summary.rows.reduce((total, row) => total + row.sharePct, 0)).toBeCloseTo(100, 10);
    expect(summary.total).toBeCloseTo(costs.totalCost, 2);
    expect(summary.rows.map((r) => r.category)).not.toContain('Other');
  });

  it('lists the inventory counts consistently', () => {
    expect(costs.resources.total).toBe(costs.resources.allResources.length);
    expect(costs.resources.byType.reduce((total, t) => total + t.count, 0)).toBe(costs.resources.total);
    expect(costs.resources.active).toBe(costs.resources.allResources.filter((r) => r.hasSpend).length);
  });

  it('has Advisor recommendations with an impact and a saving each', () => {
    expect(MOCK_AZURE_FULL.recommendations.length).toBeGreaterThanOrEqual(5);
    for (const rec of MOCK_AZURE_FULL.recommendations) {
      expect(['High', 'Medium', 'Low']).toContain(rec.impact);
      expect(Number(rec.extendedProperties.savingsAmount)).toBeGreaterThan(0);
    }
  });

  it('has one budget that is near its limit and one that is over it, so Budget Alerts has something to show', () => {
    const statuses = budgetAlerts(MOCK_AZURE_FULL.budgets).rows.map((row) => row.status);
    expect(statuses).toContain('over');
    expect(statuses).toContain('near');
  });
});

describe('Azure sample data: daily services, meters and locations', () => {
  const { costs } = MOCK_AZURE_FULL;

  it('every day of the month splits across services that add up to that day, so the month to date is unchanged', () => {
    expect(costs.totalCost).toBe(14280.55);
    for (const day of costs.dailyCosts) expect(sum(Object.values(day.byService ?? {})), day.date).toBeCloseTo(day.cost, 2);
    expect(sum(costs.dailyCosts.map((d) => d.cost))).toBeCloseTo(14280.55, 2);
  });

  it('every stored month splits its days across services too', () => {
    for (const month of MOCK_AZURE_YEARLY) {
      for (const day of month.dailyCosts) expect(sum(Object.values(day.byService ?? {})), `${month.year}-${month.month} ${day.date}`).toBeCloseTo(day.cost, 2);
    }
  });

  it('meters add up to their service, and so to the month total, in every month', () => {
    expect(costs.details.length).toBeGreaterThan(costs.services.length);
    for (const service of costs.services) {
      expect(sum(costs.details.filter((line) => line.service === service.name).map((line) => line.cost)), service.name).toBeCloseTo(service.cost, 2);
    }
    for (const month of MOCK_AZURE_YEARLY) expect(sum(month.details.map((line) => line.cost)), `${month.year}-${month.month}`).toBeCloseTo(month.totalCost, 2);
  });

  it('locations add up to the total of every month, and there are more than the donut shows', () => {
    expect(costs.locations.length).toBeGreaterThan(4);
    expect(sum(costs.locations.map((l) => l.cost))).toBeCloseTo(costs.totalCost, 2);
    for (const month of MOCK_AZURE_YEARLY) expect(sum(month.locations.map((l) => l.cost)), `${month.year}-${month.month}`).toBeCloseTo(month.totalCost, 2);
  });
});
