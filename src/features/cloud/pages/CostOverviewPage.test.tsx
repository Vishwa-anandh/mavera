import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
    // The trend summary repeats the 6-month total, so the spend KPI is read from its own card.
    expect(kpiValue('Total Spend (Month-to-Date)')).toBe('$12,000.00');
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
    expect(kpiValue('Total Spend (Month-to-Date)')).toBe('$12,000.00');
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

function summaryWithHistory() {
  // 70 days at 100 then 7 at 200 (so 7D doubles against the week before), and 24 months rising by 100.
  const daily = Array.from({ length: 77 }, (_, i) => ({ key: new Date(Date.UTC(2026, 6, 14) + i * 86_400_000).toISOString().slice(0, 10), total: i < 70 ? 100 : 200 }));
  const monthly = Array.from({ length: 24 }, (_, i) => ({ key: `${2024 + Math.floor((i + 9) / 12)}-${String(((i + 9) % 12) + 1).padStart(2, '0')}`, total: 1000 + i * 100 }));
  return loadedSource({
    totals: { azure: 8000, aws: 4000, btp: 0, gcp: 0, forecast: 13000 },
    accounts: { azure: [{ id: 'az1' }], aws: [{ id: 'aw1' }] },
    monthly,
    daily,
  });
}

describe('CostOverviewPage spend trend period', () => {
  it('defaults to 6M and offers 7D, 30D, 3M, 6M and 1Y as pressed-state buttons', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData({ summary: summaryWithHistory() }));
    renderPage();
    const group = screen.getByRole('group', { name: 'Spend trend period' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['7D', '30D', '3M', '6M', '1Y']);
    expect(within(group).getByRole('button', { name: 'Last 6 months' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('recomputes the total, the change against the previous range and the forecast for the chosen range', async () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData({ summary: summaryWithHistory() }));
    const user = userEvent.setup();
    renderPage();
    const summary = () => screen.getByTestId('trend-summary');
    expect(summary()).toHaveTextContent('Last 6 months');
    expect(summary()).toHaveTextContent('vs previous 6 months');
    expect(summary()).toHaveTextContent('Forecast, next 6 months');

    await user.click(screen.getByRole('button', { name: 'Last 7 days' }));
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(summary()).toHaveTextContent('Last 7 days');
    expect(summary()).toHaveTextContent('$1,400.00');
    expect(summary()).toHaveTextContent('100% vs previous 7 days');
    expect(summary()).toHaveTextContent('Forecast, next 7 days');

    await user.click(screen.getByRole('button', { name: 'Last 12 months' }));
    expect(summary()).toHaveTextContent('Last 12 months');
    expect(summary()).toHaveTextContent('vs previous 12 months');
  });

  it('explains when daily spend is not available instead of drawing an empty chart', async () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Last 30 days' }));
    expect(screen.getByText(/Daily spend is not available for this account yet/)).toBeInTheDocument();
    expect(screen.queryByTestId('trend-summary')).not.toBeInTheDocument();
  });
});

describe('CostOverviewPage Cloud | Invoices view', () => {
  const invoices = loadedSource({
    data: [
      { id: 'i1', invoice_number: 'MSFT-1', provider: 'azure', total_cost: 2000, invoice_date: '2026-09-01' },
      { id: 'i2', invoice_number: 'AWS-1', provider: 'aws', total_cost: 1000, invoice_date: '2026-08-01' },
      { id: 'i3', invoice_number: 'MSFT-0', provider: 'azure', total_cost: 1000, invoice_date: '2026-07-01' },
    ],
  });

  it('is a toggle with pressed state, not tabs, and starts on Cloud', () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData({ invoices }));
    renderPage();
    const group = screen.getByRole('group', { name: 'Cost Overview view' });
    expect(within(group).getByRole('button', { name: 'Cloud costs' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'Invoices summary' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText('Total Spend (Month-to-Date)')).toBeInTheDocument();
  });

  it('switches the body to an invoices summary with count, total, provider split, latest invoices and an upload link', async () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData({ invoices }));
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Invoices summary' }));

    const region = screen.getByRole('region', { name: 'Invoices summary' });
    expect(screen.queryByText('Total Spend (Month-to-Date)')).not.toBeInTheDocument();
    expect(within(region).getByText('Invoices').closest('.mv-kpi')).toHaveTextContent('3');
    expect(within(region).getByText('Total invoiced', { selector: '.mv-kpi-label' }).closest('.mv-kpi')).toHaveTextContent('$4,000.00');
    const split = within(region).getByRole('list', { name: 'Invoiced amount by provider' });
    expect(within(split).getByText('Azure')).toBeInTheDocument();
    expect(split).toHaveTextContent('2 invoices · 75% of total');
    expect(split).toHaveTextContent('1 invoice · 25% of total');
    const rows = within(region).getAllByRole('row').slice(1).map((r) => r.textContent);
    expect(rows[0]).toContain('MSFT-1');
    expect(rows).toHaveLength(3);
    expect(within(region).getByRole('link', { name: 'Upload more invoices' })).toHaveAttribute('href', '/invoices');
    expect(within(region).getByRole('link', { name: 'View all invoices' })).toHaveAttribute('href', '/invoices');
    expect(within(region).getByRole('heading', { name: 'Recent invoices' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cloud costs' }));
    expect(screen.getByText('Total Spend (Month-to-Date)')).toBeInTheDocument();
  });

  it('charts monthly invoice totals against the estimated CSP saving, with the figures and a data table behind it', async () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData({ invoices }));
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Invoices summary' }));

    const region = screen.getByRole('region', { name: 'Invoices summary' });
    expect(within(region).getByRole('heading', { name: /Maitsys CSP Savings vs Invoice Total/ })).toBeInTheDocument();
    expect(within(region).getByText('CSP savings', { selector: '.mv-kpi-label' }).closest('.mv-kpi')).toHaveTextContent('$245.00');
    const figures = region.querySelector('.mv-csp-figures') as HTMLElement;
    expect(figures).toHaveTextContent('Azure at 7.0%');
    expect(figures).toHaveTextContent('$210.00 from $3,000.00');
    expect(figures).toHaveTextContent('AWS at 3.5%');

    await user.click(within(region).getByRole('button', { name: 'View data' }));
    const dialog = screen.getByRole('dialog', { name: 'Maitsys CSP Savings vs Invoice Total' });
    expect(within(dialog).getAllByRole('row').map((r) => r.textContent)).toEqual([
      'CategoryAzureAWSCSP savings (estimated)',
      'Jul 2026$1,000.00$0.00$70.00',
      'Aug 2026$0.00$1,000.00$35.00',
      'Sep 2026$2,000.00$0.00$140.00',
    ]);
  });

  it('invites an upload when there are no invoices', async () => {
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData({ invoices: loadedSource({ data: [] }) }));
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Invoices summary' }));
    expect(screen.getByText('No invoices uploaded yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Upload invoices' })).toHaveAttribute('href', '/invoices');
  });
});
