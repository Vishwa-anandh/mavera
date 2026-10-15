import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { CostOverviewPage } from './CostOverviewPage';
import type { AuthContextValue } from '../../auth';
import type { DashboardData } from '../../dashboard';

const useAuthMock = vi.fn<() => AuthContextValue>();
const useDashboardDataMock = vi.fn<() => DashboardData & { refetch: () => void }>();

vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('../../dashboard/model/useDashboardData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../dashboard/model/useDashboardData')>();
  return { ...actual, useDashboardData: () => useDashboardDataMock() };
});

// Recharts measures its container, which jsdom doesn't lay out; give it a fixed size.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 300, height: 180 }}>{children}</div> };
});
vi.mock('../../../shared/ui/SpendTrendChart', () => ({ SpendTrendChart: () => <div>Spend trend chart stub</div> }));
vi.mock('../components/ConnectCloudAccountWizard', () => ({
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
    modules: { cloudCost: true, sapMonitoring: true },
    maxUsers: undefined,
    planType: 'enterprise',
    subscriptionStartsAt: undefined,
    subscriptionExpiresAt: undefined,
    subscriptionActive: true,
    subscriptionNotes: undefined,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    unlockAccount: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    changePassword: vi.fn(),
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

function renderPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <CostOverviewPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function kpiValue(title: string): string | null {
  const card = screen.getByText(title).closest('.mv-kpi');
  return card?.querySelector('.mv-kpi-value')?.textContent ?? null;
}

describe('CostOverviewPage', () => {
  it('shows an onboarding empty state when the org has no cloud access at all', () => {
    useAuthMock.mockReturnValue(auth({ cloudAccess: [], user: { id: '1', email: 'a@b.com', role: 'member' } }));
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderPage();
    expect(screen.getByText('Connect your first cloud account')).toBeInTheDocument();
  });

  it('does not show a KPI value while its source is still loading', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData({ summary: loadingSource() }));
    renderPage();
    expect(screen.queryByText('$12,000.00')).not.toBeInTheDocument();
  });

  it('renders each KPI value from the real response shapes once its source has loaded', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderPage();
    expect(screen.getByText('$12,000.00')).toBeInTheDocument();
    expect(screen.getByText('$800.00')).toBeInTheDocument();
    expect(kpiValue('Active Alerts')).toBe('1');
    expect(screen.getByText('4 recommendations')).toBeInTheDocument();
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
    renderPage();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(kpiValue('Active Alerts')).toBe('0');
  });

  it('shows a per-source error without hiding KPIs that loaded successfully', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(
      dashboardData({ budgets: erroredSource('Unable to load this data right now.') }),
    );
    renderPage();
    expect(screen.getByText('Unable to load this data right now.')).toBeInTheDocument();
    expect(screen.getByText('$12,000.00')).toBeInTheDocument();
  });

  it('shows a "Connect a cloud account" button when the user can connect Azure', () => {
    useAuthMock.mockReturnValue(auth({ user: { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true } }));
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderPage();
    expect(screen.getByRole('button', { name: 'Connect cloud account' })).toBeInTheDocument();
  });

  it('hides the "Connect a cloud account" button when the user cannot connect any cloud', () => {
    useAuthMock.mockReturnValue(
      auth({
        cloudAccess: ['azure'],
        user: { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true, azureReadOnly: true },
      }),
    );
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderPage();
    expect(screen.queryByRole('button', { name: 'Connect cloud account' })).not.toBeInTheDocument();
  });

  it('opens the connect-account wizard when the button is clicked', async () => {
    useAuthMock.mockReturnValue(auth({ user: { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true } }));
    useDashboardDataMock.mockReturnValue(dashboardData());
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Connect cloud account' }));
    expect(screen.getByText('Wizard stub')).toBeInTheDocument();
  });
});
