import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomePage } from './HomePage';
import type { AuthContextValue } from '../../context/AuthContext';
import type { DashboardData } from './useDashboardData';

const useAuthMock = vi.fn<() => AuthContextValue>();
const useDashboardDataMock = vi.fn<() => DashboardData & { refetch: () => void }>();

vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('./useDashboardData', () => ({ useDashboardData: () => useDashboardDataMock() }));

function auth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true },
    loading: false,
    isAuthenticated: true,
    invoiceOnly: false,
    cloudAccess: ['azure'],
    features: {
      budgets: true,
      smartAlerts: true,
      syncLogs: true,
      recommendations: true,
      cloudManagement: true,
      invoices: true,
    },
    accountLimits: { azure: 3, aws: 3, btp: 3 },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    unlockAccount: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    ...overrides,
  };
}

function loadedSource<T>(data: T) {
  return { data, loading: false, error: null };
}
function loadingSource() {
  return { data: null, loading: true, error: null };
}
function erroredSource(error: string) {
  return { data: null, loading: false, error };
}

function dashboardData(overrides: Partial<DashboardData> = {}): DashboardData & { refetch: () => void } {
  return {
    summary: loadedSource({ totalSpend: 12000, currency: 'USD', periodLabel: 'Month to date' }),
    recommendations: loadedSource([{ id: 'r1' }]),
    smartAlerts: loadedSource([{ id: 'a1', severity: 'high' as const }]),
    budgets: loadedSource([{ id: 'b1' }]),
    mspSavings: loadedSource({ estimatedSavings: 800, currency: 'USD' }),
    invoices: loadedSource([{ id: 'i1' }]),
    refetch: vi.fn(),
    ...overrides,
  } as DashboardData & { refetch: () => void };
}

describe('HomePage', () => {
  it('shows an onboarding empty state when the org has no cloud access at all', () => {
    useAuthMock.mockReturnValue(auth({ cloudAccess: [], user: { id: '1', email: 'a@b.com', role: 'member' } }));
    useDashboardDataMock.mockReturnValue(dashboardData());
    render(<HomePage />);
    expect(screen.getByText('Connect your first cloud account')).toBeInTheDocument();
  });

  it('does not show a KPI value while its source is still loading', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData({ summary: loadingSource() }));
    render(<HomePage />);
    expect(screen.queryByText('$12,000.00')).not.toBeInTheDocument();
  });

  it('renders each KPI value once its source has loaded', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    render(<HomePage />);
    expect(screen.getByText('$12,000.00')).toBeInTheDocument();
    expect(screen.getByText('Open recommendations')).toBeInTheDocument();
  });

  it('shows a per-source error without hiding KPIs that loaded successfully', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(
      dashboardData({ budgets: erroredSource('Unable to load this data right now.') }),
    );
    render(<HomePage />);
    expect(screen.getByText('Unable to load this data right now.')).toBeInTheDocument();
    expect(screen.getByText('$12,000.00')).toBeInTheDocument();
  });
});
