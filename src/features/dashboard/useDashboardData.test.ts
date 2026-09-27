import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDashboardData } from './useDashboardData';
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
        return Promise.resolve({ data: { totalSpend: 12000, currency: 'USD', periodLabel: 'Month to date' } });
      }
      if (url === '/recommendations') {
        return new Promise(() => {});
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.summary.loading).toBe(false));
    expect(result.current.summary.data).toEqual({
      totalSpend: 12000,
      currency: 'USD',
      periodLabel: 'Month to date',
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
