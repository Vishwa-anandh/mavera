import { describe, expect, it } from 'vitest';
import { extendDailyHistory, groupByCategory } from '../../shared/lib/costAnalysis';
import { awsServiceCategoryOf, resourceTypeShares } from '../../features/aws/model/awsDerivations';
import { MOCK_AWS_FULL, MOCK_AWS_YEARLY } from './mockAwsData';

const sum = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;

describe('AWS sample data is internally consistent', () => {
  const { costs } = MOCK_AWS_FULL;

  it('daily costs, services, regions and usage line items add up to the month-to-date total', () => {
    expect(sum(costs.dailyCosts.map((d) => d.cost))).toBeCloseTo(costs.totalCost, 2);
    expect(sum(costs.services.map((s) => s.cost))).toBeCloseTo(costs.totalCost, 2);
    expect(sum(costs.regions.map((r) => r.cost))).toBeCloseTo(costs.totalCost, 2);
    expect(sum(costs.details.map((d) => d.cost))).toBeCloseTo(costs.totalCost, 2);
  });

  it('every stored month sums its daily costs and its services to its total', () => {
    expect(MOCK_AWS_YEARLY).toHaveLength(12);
    for (const month of MOCK_AWS_YEARLY) {
      expect(sum(month.dailyCosts.map((d) => d.cost)), `${month.year}-${month.month} daily`).toBeCloseTo(month.totalCost, 2);
      expect(sum(month.topServices.map((s) => s.cost)), `${month.year}-${month.month} services`).toBeCloseTo(month.totalCost, 2);
    }
  });

  it('has at least 30 days of daily history once the end of the previous month is added', () => {
    expect(extendDailyHistory(costs.dailyCosts, MOCK_AWS_YEARLY).length).toBeGreaterThanOrEqual(30);
  });

  it('compute dominates the bill and the long tail (WAF, Route 53, Tax) is small', () => {
    const byName = new Map(costs.services.map((s) => [s.name, s.cost]));
    expect(costs.services[0].name).toBe('Amazon EC2');
    for (const small of ['AWS WAF', 'Amazon Route 53', 'Tax']) expect(byName.get(small)!).toBeLessThan(costs.totalCost * 0.05);
  });

  it('category shares add up to 100% and every service lands in a named category', () => {
    const summary = groupByCategory(costs.services, awsServiceCategoryOf);
    expect(summary.rows.reduce((total, row) => total + row.sharePct, 0)).toBeCloseTo(100, 10);
    expect(summary.rows.map((r) => r.category)).not.toContain('Other');
    expect(summary.rows.length).toBeGreaterThanOrEqual(5);
  });

  it('resource counts by type add up to the total and agree with the instance and bucket lists', () => {
    expect(MOCK_AWS_FULL.resources.byType.reduce((total, t) => total + t.count, 0)).toBe(MOCK_AWS_FULL.resources.total);
    const count = (type: string) => MOCK_AWS_FULL.resources.byType.find((t) => t.type === type)?.count;
    expect(count('EC2 Instances')).toBe(MOCK_AWS_FULL.instances.length);
    expect(count('S3 Buckets')).toBe(MOCK_AWS_FULL.s3Buckets.length);
    expect(resourceTypeShares(MOCK_AWS_FULL.resources.byType).reduce((total, t) => total + t.sharePct, 0)).toBeCloseTo(100, 10);
  });
});
