import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { HomePage } from './HomePage';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import type { AuthContextValue } from '../../auth';
import { sapRepository } from '../../../data-access';
import type { DashboardData } from '../model/useDashboardData';

const useAuthMock = vi.fn<() => Partial<AuthContextValue>>();
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
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 300, height: 180 }}>{children}</div> };
});

const NOW = new Date('2026-09-28T06:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

function auth(modules = { cloudCost: true, sapMonitoring: true }): Partial<AuthContextValue> {
  return {
    user: { id: '1', email: 'a@b.com', role: 'member', canViewAzure: true },
    loading: false,
    isAuthenticated: true,
    invoiceOnly: false,
    cloudAccess: ['azure'],
    modules,
  };
}

const loaded = <T,>(data: T) => ({ data, loading: false, error: null });

/** Seven days of $100 and then $10 days before that, so each range has a different total. */
const daily = Array.from({ length: 40 }, (_, i) => ({ key: new Date(Date.UTC(2026, 7, 20 + i)).toISOString().slice(0, 10), total: i >= 33 ? 100 : 10 }));

function dashboardData(): DashboardData & { refetch: () => void } {
  return {
    summary: loaded({
      totals: { azure: 8000, aws: 4000, btp: 0, gcp: 0, forecast: 13000 },
      accounts: { azure: [{ id: 'az1' }], aws: [{ id: 'aw1' }] },
      monthly: [{ key: '2026-08', total: 12000, azure: 8000, aws: 4000 }],
      daily,
    }),
    recommendations: loaded({ data: [{ id: 'r1' }], summary: { totalRecommendations: 4 } }),
    smartAlerts: loaded({
      alerts: [
        { id: 'a1', severity: 'high' as const, status: 'open', title: 'Azure spend spiked today', detected_at: hoursAgo(2) },
        { id: 'a2', severity: 'critical' as const, status: 'open', title: 'AWS budget crossed three days ago', detected_at: hoursAgo(72) },
        { id: 'a3', severity: 'high' as const, status: 'open', title: 'GCP resource created twenty days ago', detected_at: hoursAgo(24 * 20) },
        { id: 'a4', severity: 'low' as const, status: 'resolved', title: 'Old resolved one', detected_at: hoursAgo(1) },
      ],
      summary: { bySeverity: {} },
    }),
    budgets: loaded([{ id: 'b1' }]),
    mspSavings: loaded({ totalSpend: 12000, totalSavings: 800, invoiceSavings: null, breakdown: [] }),
    invoices: loaded({ data: [] }),
    refetch: vi.fn(),
  } as unknown as DashboardData & { refetch: () => void };
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

async function pick(user: ReturnType<typeof userEvent.setup>, select: RegExp, option: string) {
  await user.click(screen.getByRole('button', { name: select }));
  await user.click(screen.getByRole('option', { name: option }));
}

/** The feed shows six rows and folds the rest behind "Show N more"; open it so every row can be asserted on. */
async function showAllAttention(user: ReturnType<typeof userEvent.setup>) {
  const more = screen.queryByRole('button', { name: /^Show \d+ more/ });
  if (more) await user.click(more);
}

// The full dashboard is heavy to render, and CI machines are slow.
vi.setConfig({ testTimeout: 60000 });

const pulse = () => screen.getByRole('region', { name: 'Operations pulse' });
const glance = () => within(screen.getByLabelText('At a glance'));
const kpiValue = (label: string) => (glance().getByText(label).closest('.mv-kpi') as HTMLElement).querySelector('.mv-kpi-value')?.textContent;

describe('HomePage dashboard filters', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    useAuthMock.mockReturnValue(auth());
    useDashboardDataMock.mockReturnValue(dashboardData());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('starts with every filter at its default and shows no "filters on" line', () => {
    renderDashboard();
    expect(screen.getByRole('button', { name: /^Time range/ })).toHaveTextContent('All time');
    expect(screen.getByRole('button', { name: /^Environment/ })).toHaveTextContent('All Environments');
    expect(screen.getByRole('button', { name: /^System/ })).toHaveTextContent('All Systems');
    expect(screen.queryByRole('button', { name: 'Reset filters' })).not.toBeInTheDocument();
    expect(kpiValue('Open alerts')).not.toBe('0');
  });

  describe('Time range', () => {
    it('counts only the cloud alerts detected inside the range, and the Open alerts figure follows', async () => {
      const user = userEvent.setup();
      renderDashboard();
      expect(within(pulse()).getByText('Active alerts').parentElement).toHaveTextContent('3');
      const allTime = Number(kpiValue('Open alerts'));

      await pick(user, /^Time range/, 'Last 24 Hours');
      expect(within(pulse()).getByText('Active alerts').parentElement).toHaveTextContent('1');
      expect(Number(kpiValue('Open alerts'))).toBeLessThan(allTime);

      await pick(user, /^Time range/, 'Last 7 days');
      expect(within(pulse()).getByText('Active alerts').parentElement).toHaveTextContent('2');

      await pick(user, /^Time range/, 'Last 30 days');
      expect(within(pulse()).getByText('Active alerts').parentElement).toHaveTextContent('3');
});

    it('drops cloud alert rows from Needs attention that fall outside the range', async () => {
      const user = userEvent.setup();
      renderDashboard();
      await showAllAttention(user);
      expect(screen.getByText('GCP resource created twenty days ago')).toBeInTheDocument();
      await pick(user, /^Time range/, 'Last 7 days');
      await showAllAttention(user);
      expect(screen.queryByText('GCP resource created twenty days ago')).not.toBeInTheDocument();
      expect(screen.getByText('Azure spend spiked today')).toBeInTheDocument();
      expect(screen.getByText('AWS budget crossed three days ago')).toBeInTheDocument();
    });

    it('shows spend over the range instead of month to date, from the daily series', async () => {
      const user = userEvent.setup();
      renderDashboard();
      expect(glance().getByText('Cloud spend (MTD)')).toBeInTheDocument();
      expect(kpiValue('Cloud spend (MTD)')).toBe('$12,000.00');

      await pick(user, /^Time range/, 'Last 7 days');
      expect(glance().getByText('Spend, last 7 days')).toBeInTheDocument();
      expect(kpiValue('Spend, last 7 days')).toBe('$700.00');

      await pick(user, /^Time range/, 'Last 24 Hours');
      expect(kpiValue('Spend, latest day')).toBe('$100.00');
    });

    it('says which filter is on and Reset returns every figure to its default', async () => {
      const user = userEvent.setup();
      renderDashboard();
      const before = kpiValue('Open alerts');
      await pick(user, /^Time range/, 'Last 24 Hours');
      expect(screen.getByRole('status')).toHaveTextContent('1 filter on');
      expect(screen.getByRole('status')).toHaveTextContent('Last 24 Hours');

      await user.click(screen.getByRole('button', { name: 'Reset filters' }));
      expect(screen.getByRole('button', { name: /^Time range/ })).toHaveTextContent('All time');
      expect(kpiValue('Open alerts')).toBe(before);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('Environment', () => {
    it('narrows the SAP systems, their counts and the health list to the chosen environment', async () => {
      const user = userEvent.setup();
      renderDashboard();
      expect(kpiValue('SAP systems healthy')).toBe('3/5');

      await pick(user, /^Environment/, 'Production');
      expect(kpiValue('SAP systems healthy')).toBe('1/3');
      const panel = screen.getByText('System & Service Health Overview').closest('.mv-panel') as HTMLElement;
      expect(within(panel).getByText('HANA-PRD')).toBeInTheDocument();
      expect(within(panel).getByText('ECC-PROD')).toBeInTheDocument();
      expect(within(panel).queryByText('S4H-QA')).not.toBeInTheDocument();
      expect(within(panel).queryByText('S4H-DEV')).not.toBeInTheDocument();

      await pick(user, /^Environment/, 'QA');
      expect(kpiValue('SAP systems healthy')).toBe('1/1');
      expect(screen.queryByText('HANA-PRD is critical')).not.toBeInTheDocument();
      expect(within(screen.getByText('System & Service Health Overview').closest('.mv-panel') as HTMLElement).getByText('S4H-QA')).toBeInTheDocument();
    });

    it('splits only SAP systems and says so next to cloud figures', async () => {
      const user = userEvent.setup();
      renderDashboard();
      const alertsBefore = within(pulse()).getByText('Active alerts').parentElement?.textContent;
      await pick(user, /^Environment/, 'Development');
      expect(within(pulse()).getByText('Active alerts').parentElement?.textContent).toBe(alertsBefore);
      expect(screen.getAllByText(/Applies to SAP systems/).length).toBeGreaterThan(0);
    });

    it('gives a one-line empty state, with a way back, when no SAP system is in that environment', async () => {
      const real = sapRepository.listSystems();
      vi.spyOn(sapRepository, 'listSystems').mockImplementation(() => structuredClone(real.filter((s) => s.environment === 'Production')));
      const user = userEvent.setup();
      renderDashboard();
      await pick(user, /^Environment/, 'QA');
      const panel = screen.getByText('System & Service Health Overview').closest('.mv-panel') as HTMLElement;
      expect(panel).toHaveTextContent('No SAP systems in QA.');
      await user.click(within(panel).getByRole('button', { name: 'Reset filters' }));
      expect(within(screen.getByText('System & Service Health Overview').closest('.mv-panel') as HTMLElement).getByText('HANA-PRD')).toBeInTheDocument();
    });
  });

  describe('System', () => {
    it('SAP shows only the SAP half: card, KPIs, feed and quick access', async () => {
      const user = userEvent.setup();
      renderDashboard();
      await pick(user, /^System/, 'SAP');

      expect(within(screen.getByRole('region', { name: 'Operations pulse' })).getByText('SAP Monitoring')).toBeInTheDocument();
      expect(screen.queryByText('Cloud Cost Monitoring')).not.toBeInTheDocument();
      expect(glance().queryByText('Cloud spend (MTD)')).not.toBeInTheDocument();
      expect(glance().queryByText('Forecast vs budget')).not.toBeInTheDocument();
      expect(glance().getByText('SAP systems healthy')).toBeInTheDocument();
      expect(screen.queryByText('Azure spend spiked today')).not.toBeInTheDocument();
      expect(screen.getByText('HANA-PRD is critical')).toBeInTheDocument();
      expect(screen.queryByText('Cloud Cost by Provider')).not.toBeInTheDocument();
      expect(screen.getByText('Add SAP System')).toBeInTheDocument();
      expect(screen.queryByText('Add Azure Subscription')).not.toBeInTheDocument();
    });

    it('Cloud shows only the cloud half', async () => {
      const user = userEvent.setup();
      renderDashboard();
      await pick(user, /^System/, 'Cloud');

      expect(screen.getByText('Cloud Cost Monitoring')).toBeInTheDocument();
      expect(screen.queryByText('SAP Monitoring')).not.toBeInTheDocument();
      expect(glance().queryByText('SAP systems healthy')).not.toBeInTheDocument();
      expect(glance().queryByText('HANA memory')).not.toBeInTheDocument();
      expect(screen.queryByText('HANA-PRD is critical')).not.toBeInTheDocument();
      expect(screen.queryByText('System & Service Health Overview')).not.toBeInTheDocument();
      expect(screen.getByText('Add Azure Subscription')).toBeInTheDocument();
      expect(screen.queryByText('Add SAP System')).not.toBeInTheDocument();
      expect(screen.getByText('Azure spend spiked today')).toBeInTheDocument();
    });

    it('keeps the subscription count about what the organisation has, not what is shown', async () => {
      const user = userEvent.setup();
      renderDashboard();
      await pick(user, /^System/, 'SAP');
      expect(screen.getByText('2 of 2 modules active')).toBeInTheDocument();
    });

    it('is not offered when only one module is subscribed, and a remembered choice does not hide that module', () => {
      sessionStorage.setItem('mv-remembered:dashboard:system', JSON.stringify('sap'));
      useAuthMock.mockReturnValue(auth({ cloudCost: true, sapMonitoring: false }));
      renderDashboard();
      expect(screen.queryByRole('button', { name: /^System/ })).not.toBeInTheDocument();
      expect(screen.getByText('Cloud Cost Monitoring')).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('remembers the filters for the session', async () => {
    const user = userEvent.setup();
    const first = renderDashboard();
    await pick(user, /^Time range/, 'Last 7 days');
    await pick(user, /^Environment/, 'Production');
    first.unmount();

    renderDashboard();
    expect(screen.getByRole('button', { name: /^Time range/ })).toHaveTextContent('Last 7 days');
    expect(screen.getByRole('button', { name: /^Environment/ })).toHaveTextContent('Production');
    expect(screen.getByRole('status')).toHaveTextContent('2 filters on');
  });

  it('reaches any filter in two clicks: open the select, pick the option', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const click = vi.fn();
    document.addEventListener('click', click, true);
    await pick(user, /^Time range/, 'Last 30 days');
    document.removeEventListener('click', click, true);
    expect(click).toHaveBeenCalledTimes(2);
  });
});
