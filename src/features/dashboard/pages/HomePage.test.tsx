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
    modules: { cloudCost: true, idocMonitoring: true, sapMonitoring: true },
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
  it('renders a ModuleCard for each of the three modules with real cost KPI values', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderDashboard();

    expect(screen.getByText('SAP Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Cloud Cost Monitoring')).toBeInTheDocument();
    expect(screen.getByText('IDoc Monitoring')).toBeInTheDocument();
    expect(screen.getByText('$12,000.00')).toBeInTheDocument();
  });

  it('shows the SAP system health overview table', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderDashboard();

    const healthPanel = screen.getByText('System & Service Health Overview').closest('.mv-panel') as HTMLElement;
    expect(within(healthPanel).getByText('HANA-PRD')).toBeInTheDocument();
  });

  it('shows the cloud cost by provider and IDoc status charts', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderDashboard();

    expect(screen.getByRole('img', { name: 'Cloud cost by provider' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'IDoc status (last 24 hours)' })).toBeInTheDocument();
  });

  it('shows recent alerts from every module with a link to the full alerts page', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderDashboard();

    expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
    expect(screen.getByText('High CPU usage (92%)')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View all' }).some((link) => link.getAttribute('href') === '/alerts')).toBe(true);
  });

  it('shows the subscription summary', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderDashboard();
    expect(screen.getByText('3 of 3 modules active')).toBeInTheDocument();
  });

  it('adapts to an org subscribed to only 2 of 3 modules: drops the disabled module everywhere and updates the count', () => {
    useAuthMock.mockReturnValue(auth({ modules: { cloudCost: true, idocMonitoring: true, sapMonitoring: false } }));
    useDashboardDataMock.mockReturnValue(dashboardData());
    renderDashboard();

    expect(screen.queryByText('SAP Monitoring')).not.toBeInTheDocument();
    expect(screen.queryByText('System & Service Health Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Add SAP System')).not.toBeInTheDocument();
    expect(screen.getByText('Cloud Cost Monitoring')).toBeInTheDocument();
    expect(screen.getByText('IDoc Monitoring')).toBeInTheDocument();
    expect(screen.getByText('2 of 3 modules active')).toBeInTheDocument();
  });
});
