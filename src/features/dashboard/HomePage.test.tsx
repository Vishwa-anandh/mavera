import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from './HomePage';
import type { AuthContextValue } from '../../context/AuthContext';
import type { DashboardData } from './useDashboardData';

const useAuthMock = vi.fn<() => AuthContextValue>();
const useDashboardDataMock = vi.fn<() => DashboardData & { refetch: () => void }>();

vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('./useDashboardData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./useDashboardData')>();
  return { ...actual, useDashboardData: () => useDashboardDataMock() };
});

vi.mock('./SpendTrendChart', () => ({ SpendTrendChart: () => <div>Spend trend chart stub</div> }));
vi.mock('./ConnectCloudAccountWizard', () => ({
  ConnectCloudAccountWizard: ({ onClose }: { onClose: () => void }) => (
    <div>
      Wizard stub
      <button onClick={onClose}>Close wizard</button>
    </div>
  ),
}));

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
    // Real backend shapes (reference HomePage.jsx data load).
    summary: loadedSource({
      totals: { azure: 8000, aws: 4000, btp: 0, gcp: 0, forecast: 13000 },
      accounts: { azure: [{ id: 'az1' }], aws: [{ id: 'aw1' }] },
      monthly: [{ key: '2026-08', total: 12000, azure: 8000, aws: 4000 }],
    }),
    recommendations: loadedSource({ data: [{ id: 'r1' }], summary: { totalRecommendations: 4 } }),
    smartAlerts: loadedSource({
      alerts: [
        { id: 'a1', severity: 'high' as const, status: 'open' },
        { id: 'a2', severity: 'low' as const, status: 'resolved' },
      ],
      summary: { bySeverity: { high: 1 } },
    }),
    budgets: loadedSource([{ id: 'b1' }]),
    mspSavings: loadedSource({ totalSpend: 12000, totalSavings: 800, invoiceSavings: null, breakdown: [] }),
    invoices: loadedSource({ data: [{ id: 'i1' }, { id: 'i2' }] }),
    refetch: vi.fn(),
    ...overrides,
  } as DashboardData & { refetch: () => void };
}

function kpiValue(title: string): string | null {
  const card = screen.getByText(title).closest('.ant-statistic');
  return card?.querySelector('.ant-statistic-content')?.textContent ?? null;
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

  it('renders each KPI value from the real response shapes once its source has loaded', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    render(<HomePage />);
    // totals.azure + totals.aws
    expect(screen.getByText('$12,000.00')).toBeInTheDocument();
    // msp-savings totalSavings
    expect(screen.getByText('$800.00')).toBeInTheDocument();
    expect(kpiValue('Open recommendations')).toBe('4');
    expect(kpiValue('Active alerts')).toBe('1');
    expect(kpiValue('Tracked budgets')).toBe('1');
    expect(kpiValue('Invoices on file')).toBe('2');
  });

  it('renders without crashing when a source returns an unexpected shape', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(
      dashboardData({
        summary: loadedSource([] as never),
        recommendations: loadedSource([] as never),
        smartAlerts: loadedSource([] as never),
        invoices: loadedSource([] as never),
      }),
    );
    render(<HomePage />);
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(kpiValue('Open recommendations')).toBe('0');
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

  it('shows a "Connect a cloud account" button when the user can connect Azure', () => {
    useAuthMock.mockReturnValue(auth({ user: { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true } }));
    useDashboardDataMock.mockReturnValue(dashboardData());
    render(<HomePage />);
    expect(screen.getByRole('button', { name: 'Connect a cloud account' })).toBeInTheDocument();
  });

  it('hides the "Connect a cloud account" button when the user cannot connect any cloud', () => {
    useAuthMock.mockReturnValue(
      auth({
        cloudAccess: ['azure'],
        user: { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true, azureReadOnly: true },
      }),
    );
    useDashboardDataMock.mockReturnValue(dashboardData());
    render(<HomePage />);
    expect(screen.queryByRole('button', { name: 'Connect a cloud account' })).not.toBeInTheDocument();
  });

  it('opens the connect-account wizard when the button is clicked', async () => {
    useAuthMock.mockReturnValue(auth({ user: { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true } }));
    useDashboardDataMock.mockReturnValue(dashboardData());
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: 'Connect a cloud account' }));
    expect(screen.getByText('Wizard stub')).toBeInTheDocument();
  });
});
