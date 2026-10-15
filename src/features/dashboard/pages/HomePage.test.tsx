import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { HomePage } from './HomePage';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import type { AuthContextValue } from '../../auth';
import type { DashboardData } from '../model/useDashboardData';

const useAuthMock = vi.fn<() => AuthContextValue>();
const useDashboardDataMock = vi.fn<() => DashboardData & { refetch: () => void }>();

vi.mock('../../auth/model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/model/AuthContext')>();
  return { ...actual, useAuth: () => useAuthMock() };
});

vi.mock('../model/useDashboardData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../model/useDashboardData')>();
  return { ...actual, useDashboardData: () => useDashboardDataMock() };
});

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 300, height: 180 }}>{children}</div>
    ),
  };
});

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

function renderDashboard() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('HomePage (unified dashboard)', () => {
  it('renders a ModuleCard for each of the two modules with real cost KPI values', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderDashboard();

    expect(screen.getByText('SAP Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Cloud Cost Monitoring')).toBeInTheDocument();
    const pulse = screen.getByRole('region', { name: 'Operations pulse' });
    expect(within(pulse).getByText('$12,000.00')).toBeInTheDocument();
  });

  it('consolidates the key figures of every subscribed module into one glance strip', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderDashboard();

    const strip = screen.getByLabelText('At a glance');
    expect(within(strip).getByText('Cloud spend (MTD)')).toBeInTheDocument();
    expect(within(strip).getByText('$12,000.00')).toBeInTheDocument();
    expect(within(strip).getByText('Forecast vs budget')).toBeInTheDocument();
    expect(within(strip).getByText('SAP systems healthy')).toBeInTheDocument();
    expect(within(strip).getByText('3/5')).toBeInTheDocument();
    expect(within(strip).getByText('HANA memory')).toBeInTheDocument();
    expect(within(strip).getByText('Open alerts')).toBeInTheDocument();
  });

  it('shows the SAP system health overview table', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderDashboard();

    const healthPanel = screen.getByText('System & Service Health Overview').closest('.mv-panel') as HTMLElement;
    expect(within(healthPanel).getByText('HANA-PRD')).toBeInTheDocument();
  });

  it('shows the cloud cost by provider chart', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderDashboard();

    expect(screen.getByRole('img', { name: 'Cloud cost by provider' })).toBeInTheDocument();
  });

  it('lists what needs attention across modules, most urgent first, each row linking to its page', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderDashboard();

    const panel = screen.getByRole('heading', { name: 'Needs attention' }).closest('.mv-panel') as HTMLElement;
    const list = within(panel).getByRole('list', { name: 'Items that need attention' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(6);
    expect(within(rows[0]).getByText('HANA-PRD is critical')).toBeInTheDocument();
    expect(within(rows[0]).getByRole('link')).toHaveAttribute('href', '/sap/systems');
    expect(within(panel).getByRole('link', { name: 'All alerts' })).toHaveAttribute('href', '/alerts');
  });

  it('shows the subscription summary', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderDashboard();
    expect(screen.getByText('2 of 2 modules active')).toBeInTheDocument();
  });

  it('adapts to an org subscribed to only 1 of 2 modules: drops the disabled module everywhere and updates the count', () => {
    useAuthMock.mockReturnValue(auth({ modules: { cloudCost: true, sapMonitoring: false } }));
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderDashboard();

    expect(screen.queryByText('SAP Monitoring')).not.toBeInTheDocument();
    expect(screen.queryByText('System & Service Health Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Add SAP System')).not.toBeInTheDocument();
    expect(screen.queryByText('HANA-PRD is critical')).not.toBeInTheDocument();
    expect(screen.queryByText('SAP systems healthy')).not.toBeInTheDocument();
    expect(screen.queryByText('HANA memory')).not.toBeInTheDocument();
    expect(screen.getByText('Cloud Cost Monitoring')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 modules active')).toBeInTheDocument();
  });
});
