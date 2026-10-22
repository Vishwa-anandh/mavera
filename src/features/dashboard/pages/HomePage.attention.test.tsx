import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { HomePage } from './HomePage';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { ToastListener } from '../../../shared/ui/ToastListener';
import type { AuthContextValue } from '../../auth';
import { resetSapAdminStore, resetSmartAlertsStore, sapAdminRepository, smartAlertsRepository } from '../../../data-access';
import { repositoryAlertItems } from '../model/repositoryAlerts';
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

const loaded = <T,>(data: T) => ({ data, loading: false, error: null });
const dashboardData = (): DashboardData & { refetch: () => void } => ({
  summary: loaded({ totals: { azure: 8000, aws: 4000, btp: 0, gcp: 0, forecast: 13000 }, accounts: { azure: [{ id: 'az1' }] }, monthly: [{ key: '2026-08', total: 12000, azure: 8000, aws: 4000 }] }),
  recommendations: loaded({ data: [], summary: { totalRecommendations: 0 } }),
  smartAlerts: loaded({ alerts: repositoryAlertItems(), summary: { bySeverity: {} } }),
  budgets: loaded([]),
  mspSavings: loaded({ totalSpend: 12000, totalSavings: 0, invoiceSavings: null, breakdown: [] }),
  invoices: loaded({ data: [] }),
  refetch: vi.fn(),
});

const renderDashboard = () => render(<ThemeProvider><MemoryRouter><HomePage /><ToastListener /></MemoryRouter></ThemeProvider>);
const openAlerts = () => {
  const tile = within(screen.getByLabelText('At a glance')).getByText('Open alerts').closest('article') as HTMLElement;
  return Number(within(tile).getByText(/^\d+$/).textContent);
};
const attentionRows = () => within(screen.getByRole('list', { name: 'Items that need attention' })).getAllByRole('listitem');

describe('HomePage: Needs attention acts in place', () => {
  beforeEach(() => {
    resetSmartAlertsStore();
    resetSapAdminStore();
    useAuthMock.mockReturnValue({
      user: { id: 'o', email: 'owner@mavera.local', name: 'Olive Owner', role: 'admin', canViewAzure: true, canViewAws: true, canViewBtp: true, canViewGcp: true },
      cloudAccess: ['azure', 'aws', 'btp', 'gcp'], invoiceOnly: false, modules: { cloudCost: true, sapMonitoring: true },
    });
    useDashboardDataMock.mockImplementation(dashboardData);
  });
  afterEach(() => {
    resetSmartAlertsStore();
    resetSapAdminStore();
  });

  it('resolves a cost alert from the dashboard in one click: the row, the count and the store all change, and Undo brings it back', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const before = openAlerts();
    const alert = smartAlertsRepository.list().find((a) => a.id === 'alert-1')!;
    const row = attentionRows().find((li) => within(li).queryByRole('button', { name: `Resolve: ${alert.message}` }))!;
    expect(row).toBeTruthy();

    await user.click(within(row).getByRole('button', { name: `Resolve: ${alert.message}` }));

    expect(smartAlertsRepository.list().find((a) => a.id === 'alert-1')?.status).toBe('resolved');
    expect(screen.queryByRole('button', { name: `Resolve: ${alert.message}` })).toBeNull();
    expect(openAlerts()).toBe(before - 1);
    expect(await screen.findByText(/^Alert resolved: Azure spend is 42% above the forecasted band/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(smartAlertsRepository.list().find((a) => a.id === 'alert-1')?.status).toBe('unread');
    expect(screen.getByRole('button', { name: `Resolve: ${alert.message}` })).toBeInTheDocument();
    expect(openAlerts()).toBe(before);
  });

  it('ignores an SAP alert in the SAP alert store, so the SAP count on the dashboard drops with it', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const sapAlert = sapAdminRepository.alerts.list().find((a) => a.state === 'active' && !a.read && (a.severity === 'High' || a.severity === 'Critical'))!;
    const before = openAlerts();
    // SAP warnings rank below the critical cost alerts, so they sit behind "Show more".
    await user.click(screen.getByRole('button', { name: /^Show \d+ more$/ }));
    const ignore = screen.getByRole('button', { name: new RegExp(`^Ignore: ${sapAlert.type} anomaly on`) });
    await user.click(ignore);
    expect(sapAdminRepository.alerts.list().find((a) => a.id === sapAlert.id)).toMatchObject({ state: 'ignored', read: true });
    expect(openAlerts()).toBe(before - 1);
  });

  it('resolves every alert on show with Resolve all and one Undo', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const active = () => smartAlertsRepository.list().filter((a) => !a.ignored && a.status !== 'resolved').length;
    const sapUnread = () => sapAdminRepository.alerts.list().filter((a) => a.state === 'active' && !a.read).length;
    const [cloudBefore, sapBefore] = [active(), sapUnread()];
    const resolveAll = screen.getByRole('button', { name: /^Resolve all \d+ alerts$/ });
    const count = Number(/\d+/.exec(resolveAll.textContent ?? '')?.[0]);
    await user.click(resolveAll);
    expect(cloudBefore + sapBefore - (active() + sapUnread())).toBe(count);

    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(active()).toBe(cloudBefore);
    expect(sapUnread()).toBe(sapBefore);
    await act(async () => {});
  });

  it('still links each row to where the alert is handled in full', async () => {
    renderDashboard();
    await userEvent.setup().click(screen.getByRole('button', { name: /^Show \d+ more$/ }));
    const list = screen.getByRole('list', { name: 'Items that need attention' });
    const hrefs = within(list).getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(hrefs.some((href) => href?.startsWith('/smart-alerts'))).toBe(true);
    expect(hrefs.some((href) => href === '/sap/alerts')).toBe(true);
  });
});
