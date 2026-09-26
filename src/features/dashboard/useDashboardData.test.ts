import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from './useDashboardData';
import { api } from '../../api';

vi.mock('../../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api')>();
  return { ...actual, api: { ...actual.api, get: vi.fn() } };
});

// The "refetch resets..." test below deliberately calls result.current.refetch()
// as a plain synchronous call (mirroring a real onClick handler) and asserts
// state was updated synchronously via the hook's internal flushSync. That
// assertion is exactly what the act(...) warning is cautioning against, but
// it is intentional here, not a genuine violation — so this suppression is
// scoped to this file only, not src/test/setup.ts.
const ACT_WARNING = 'was not wrapped in act';
let originalConsoleError: typeof console.error;

beforeEach(() => {
  originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes(ACT_WARNING)) {
      return;
    }
    originalConsoleError(...args);
  };
  vi.mocked(api.get).mockReset();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('useDashboardData', () => {
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
    result.current.refetch();

    expect(result.current.summary.loading).toBe(true);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
  });
});
