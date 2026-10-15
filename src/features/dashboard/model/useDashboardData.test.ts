import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  activeAlertCountOf,
  budgetCountOf,
  invoiceCountOf,
  monthlyByProviderOf,
  monthlyTrendOf,
  mspSavingsTotalOf,
  providerMoversOf,
  recommendationCountOf,
  totalSpendOf,
  useDashboardData,
} from './useDashboardData';
import { api } from '../../../data-access';

vi.mock('../../../data-access/rest/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../data-access/rest/client')>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it('starts every source in a loading state', () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.summary.loading).toBe(true);
    expect(result.current.recommendations.loading).toBe(true);
  });

  it('populates each source independently as its own request resolves', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/summary/dashboard') {
        return Promise.resolve({
          data: { totals: { azure: 7000, aws: 5000 }, accounts: {}, monthly: [{ key: '2026-08', total: 12000 }] },
        });
      }
      if (url === '/recommendations') {
        return new Promise(() => {});
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.summary.loading).toBe(false));
    expect(result.current.summary.data).toEqual({
      totals: { azure: 7000, aws: 5000 },
      accounts: {},
      monthly: [{ key: '2026-08', total: 12000 }],
    });
    expect(result.current.recommendations.loading).toBe(true);
  });

  it('records a per-source error without affecting other sources', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/budgets') return Promise.reject(new Error('boom'));
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.budgets.loading).toBe(false));
    expect(result.current.budgets.error).toBe('Unable to load this data right now.');
    await waitFor(() => expect(result.current.invoices.loading).toBe(false));
    expect(result.current.invoices.error).toBeNull();
  });

  it('refetch resets every source back to loading and re-requests', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.invoices.loading).toBe(false));

    vi.mocked(api.get).mockClear();
    act(() => {
      result.current.refetch();
    });

    expect(result.current.summary.loading).toBe(true);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
  });
});

// Payloads below are the real backend shapes as read by the reference app's
// HomePage.jsx (see the Promise.all data load there).
describe('dashboard derivations', () => {
  it('sums totals.{azure,aws,btp,gcp} from /summary/dashboard', () => {
    expect(totalSpendOf({ totals: { azure: 100, aws: 50.5, btp: 25, gcp: 4.5, forecast: 999 } })).toBe(180);
  });

  it('maps /summary/dashboard monthly[{key,total}] to sorted chart points', () => {
    expect(
      monthlyTrendOf({
        monthly: [
          { key: '2026-08', total: 200, azure: 150, aws: 50 },
          { key: '2026-07', total: 100 },
        ],
      }),
    ).toEqual([
      { date: '2026-07', amount: 100 },
      { date: '2026-08', amount: 200 },
    ]);
  });

  it('prefers /recommendations summary.totalRecommendations, falling back to data.length', () => {
    expect(recommendationCountOf({ data: [{ id: 1 }], summary: { totalRecommendations: 7 } })).toBe(7);
    expect(recommendationCountOf({ data: [{ id: 1 }, { id: 2 }], summary: null })).toBe(2);
  });

  it('counts only non-resolved /smart-alerts alerts', () => {
    expect(
      activeAlertCountOf({
        alerts: [
          { id: 1, severity: 'high', status: 'open' },
          { id: 2, severity: 'low', status: 'resolved' },
        ],
        summary: {},
      }),
    ).toBe(1);
  });

  it('reads /insights/msp-savings totalSavings and /invoices data.length', () => {
    expect(mspSavingsTotalOf({ totalSpend: 1000, totalSavings: 70, invoiceSavings: null, breakdown: [] })).toBe(70);
    expect(invoiceCountOf({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] })).toBe(3);
    expect(budgetCountOf([{ id: 1 }])).toBe(1);
  });

  it('tolerates a bare array for /recommendations and /invoices, as the reference does', () => {
    expect(recommendationCountOf([{ id: 1 }, { id: 2 }])).toBe(2);
    expect(invoiceCountOf([{ id: 1 }])).toBe(1);
  });

  it('degrades to zero/empty instead of throwing on unexpected shapes', () => {
    const garbage = 'not-an-object' as never;
    expect(() => totalSpendOf(garbage)).not.toThrow();
    expect(totalSpendOf(garbage)).toBe(0);
    expect(monthlyTrendOf(garbage)).toEqual([]);
    expect(recommendationCountOf(garbage)).toBe(0);
    expect(activeAlertCountOf(garbage)).toBe(0);
    expect(mspSavingsTotalOf(garbage)).toBe(0);
    expect(invoiceCountOf(garbage)).toBe(0);
    expect(budgetCountOf({} as never)).toBe(0);
  });
});

describe('provider breakdown helpers', () => {
  const summary = {
    monthly: [
      { key: '2026-09', total: 1300, azure: 600, aws: 400, btp: 300, gcp: 0 },
      { key: '2026-07', total: 1000, azure: 500, aws: 400, btp: 100, gcp: 0 },
      { key: '2026-08', total: 1100, azure: 500, aws: 500, btp: 100, gcp: 0 },
    ],
  };

  it('returns the latest months in order, labelled by month name', () => {
    expect(monthlyByProviderOf(summary, 2).map((r) => [r.key, r.name, r.azure])).toEqual([['2026-08', 'Aug', 500], ['2026-09', 'Sep', 600]]);
    expect(monthlyByProviderOf(null)).toEqual([]);
  });

  it('ranks providers by the size of their month-over-month move', () => {
    const movers = providerMoversOf(summary);
    expect(movers.map((m) => m.provider)).toEqual(['btp', 'azure', 'aws']);
    expect(movers[0]).toMatchObject({ provider: 'btp', delta: 200, changePct: 200 });
    expect(movers.find((m) => m.provider === 'aws')).toMatchObject({ delta: -100, changePct: -20 });
    expect(movers.some((m) => m.provider === 'gcp')).toBe(false);
  });

  it('has no movers without two months of history, and no percentage without previous spend', () => {
    expect(providerMoversOf({ monthly: [{ key: '2026-09', total: 1, azure: 1 }] })).toEqual([]);
    const fresh = providerMoversOf({ monthly: [{ key: '2026-08', total: 0 }, { key: '2026-09', total: 5, aws: 5 }] });
    expect(fresh[0]).toMatchObject({ provider: 'aws', changePct: null });
  });
});
