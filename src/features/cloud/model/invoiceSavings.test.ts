import { describe, expect, it } from 'vitest';
import { invoiceItemsOf, invoiceSavingsOf } from './invoiceSavings';

const items = [
  { id: 1, provider: 'azure', total_cost: 2000, invoice_date: '2026-10-01', billing_period_start: '2026-09-01' },
  { id: 2, provider: 'aws', total_cost: '1000', invoice_date: '2026-08-02' },
  { id: 3, provider: 'azure', total_cost: 1000, invoice_date: '2026-07-01' },
  { id: 4, provider: 'btp', total_cost: 'n/a', created_at: '2026-09-15' },
  { id: 5, provider: 'gcp', total_cost: 500 },
];

describe('invoiceSavingsOf', () => {
  const result = invoiceSavingsOf(items);

  it('groups invoices by billed month, oldest first, and takes the saving at the provider rate', () => {
    expect(result.months.map((m) => [m.name, m.total, m.savings])).toEqual([
      ['Jul 2026', 1000, 70],
      ['Aug 2026', 1000, 35],
      ['Sep 2026', 2000, 140],
    ]);
    expect(result.months[2]).toMatchObject({ azure: 2000, aws: 0 });
  });

  it('totals everything, including an invoice with no usable date, and works out the average rate', () => {
    expect(result.invoiced).toBe(4500);
    expect(result.savings).toBeCloseTo(262.5, 6);
    expect(result.avgRate).toBeCloseTo(262.5 / 4500, 6);
  });

  it('lists each provider with its rate, base and saving, largest saving first', () => {
    expect(result.byProvider.map((p) => [p.provider, p.rate, p.base, p.savings])).toEqual([
      ['azure', 0.07, 3000, 210],
      ['aws', 0.035, 1000, 35],
      ['gcp', 0.035, 500, 17.5],
      ['btp', 0.02, 0, 0],
    ]);
  });

  it('keeps only the latest months up to the limit', () => {
    expect(invoiceSavingsOf(items, 2).months.map((m) => m.name)).toEqual(['Aug 2026', 'Sep 2026']);
  });

  it('copes with nothing at all', () => {
    expect(invoiceSavingsOf([])).toEqual({ months: [], invoiced: 0, savings: 0, avgRate: 0, byProvider: [] });
  });
});

describe('invoiceItemsOf', () => {
  it('reads a wrapped response, a bare array and nothing', () => {
    expect(invoiceItemsOf({ data: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(invoiceItemsOf([{ id: 2 }])).toEqual([{ id: 2 }]);
    expect(invoiceItemsOf(null)).toEqual([]);
    expect(invoiceItemsOf({})).toEqual([]);
  });
});
