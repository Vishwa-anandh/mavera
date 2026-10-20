import { describe, it, expect } from 'vitest';
import { invoiceSummaryOf } from './useDashboardData';

const invoices = [
  { id: 1, provider: 'azure', total_cost: 2000, invoice_date: '2026-09-01' },
  { id: 2, provider: 'aws', total_cost: 1000, invoice_date: '2026-08-01' },
  { id: 3, provider: 'azure', total_cost: '1000', invoice_date: '2026-07-01' },
  { id: 4, provider: 'gcp', total_cost: 'n/a', created_at: '2026-09-15' },
];

describe('invoiceSummaryOf', () => {
  it('counts invoices, adds up the total and splits it by provider, biggest first', () => {
    const summary = invoiceSummaryOf({ data: invoices });
    expect(summary.count).toBe(4);
    expect(summary.total).toBe(4000);
    expect(summary.providers).toEqual([
      { provider: 'azure', count: 2, total: 3000, sharePct: 75 },
      { provider: 'aws', count: 1, total: 1000, sharePct: 25 },
      { provider: 'gcp', count: 1, total: 0, sharePct: 0 },
    ]);
  });

  it('lists the newest invoices first, falling back to the upload date, up to the limit', () => {
    expect(invoiceSummaryOf({ data: invoices }, 3).latest.map((i) => i.id)).toEqual([4, 1, 2]);
  });

  it('accepts a bare array and copes with nothing at all', () => {
    expect(invoiceSummaryOf(invoices).count).toBe(4);
    expect(invoiceSummaryOf(null)).toEqual({ count: 0, total: 0, providers: [], latest: [] });
    expect(invoiceSummaryOf({} as never).count).toBe(0);
  });
});
