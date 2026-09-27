import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  activeAlertCountOf,
  budgetCountOf,
  invoiceCountOf,
  monthlyTrendOf,
  mspSavingsTotalOf,
  recommendationCountOf,
  totalSpendOf,
  useDashboardData,
} from './useDashboardData';
import { api } from '../../api';

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>();
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

  it('degrades to zero/empty instead of throwing on unexpected shapes', () => {
    const garbage = [] as never;
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
