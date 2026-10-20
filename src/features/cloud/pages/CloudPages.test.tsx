import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { cloudInsightsRepository } from '../../../data-access';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { resetOpportunityStates } from '../../../shared/lib/opportunityStore';
import { formatMoney } from '../model/cloudFormat';
import { CostAnalyticsPage } from './CostAnalyticsPage';
import { OptimizationAdvisorPage } from './OptimizationAdvisorPage';
import { ReservationsPage } from './ReservationsPage';
import { ResourceInventoryPage } from './ResourceInventoryPage';

// Savings & Optimization opens with the savings overview, which reads the signed-in user's access.
vi.mock('../../auth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'a@b.com', role: 'admin' },
    cloudAccess: ['azure', 'aws'],
    invoiceOnly: false,
    features: { budgets: true, smartAlerts: true, syncLogs: true, recommendations: true, cloudManagement: true, invoices: true },
  }),
}));

const wrap = (node: ReactNode) => render(<ThemeProvider><MemoryRouter>{node}</MemoryRouter></ThemeProvider>);

describe('Cloud Cost pages', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    resetOpportunityStates();
  });

  it('Cost Analytics never adds EUR (SAP BTP) to USD totals', async () => {
    const user = userEvent.setup();
    wrap(<CostAnalyticsPage />);
    expect(screen.getByText(/SAP BTP is billed in EUR/)).toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Providers'));
    await user.click(screen.getByRole('option', { name: 'SAP BTP (EUR)' }));
    expect(screen.getAllByText(/€/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/SAP BTP is billed in EUR/)).not.toBeInTheDocument();
  });

  it('Cost Analytics says when a provider has no history to compare', () => {
    wrap(<CostAnalyticsPage />);
    expect(screen.getByText(/Excludes Google Cloud \(no history\)/)).toBeInTheDocument();
    expect(screen.getAllByText('No history').length).toBeGreaterThan(0);
  });

  it('Resource Inventory shows missing tags as Untagged and missing cost as Not reported', async () => {
    const user = userEvent.setup();
    wrap(<ResourceInventoryPage />);
    expect(screen.getAllByText('Not reported').length).toBeGreaterThan(0);

    await user.click(screen.getByLabelText('Tags'));
    await user.click(screen.getByRole('option', { name: 'Untagged' }));
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(within(row).getByText('Untagged')).toBeInTheDocument();
  });

  it('Optimization Advisor leaves overlapping recommendations out of the total', () => {
    wrap(<OptimizationAdvisorPage />);
    // The test organisation is subscribed to Azure and AWS only, so SAP BTP and Google Cloud findings stay out.
    const all = cloudInsightsRepository.listOptimizationOpportunities().filter((o) => o.provider === 'azure' || o.provider === 'aws');
    const expected = all.filter((o) => !o.overlapsWith || !all.some((x) => x.id === o.overlapsWith)).reduce((s, o) => s + o.monthlySaving, 0);
    expect(screen.getByText(formatMoney(expected, 'USD'))).toBeInTheDocument();
    expect(screen.getByText(/1 overlapping not double-counted/)).toBeInTheDocument();
  });

  it('Savings & Optimization shows the savings overview above the opportunities, once each', () => {
    wrap(<OptimizationAdvisorPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Savings & Optimization' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Savings overview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Opportunities' })).toBeInTheDocument();
    // The top recommendations are part of the overview now, once.
    expect(screen.getAllByRole('heading', { name: 'Top recommendations' })).toHaveLength(1);
  });

  it('Optimization Advisor dismisses with a reason and only records the decision', async () => {
    const user = userEvent.setup();
    wrap(<OptimizationAdvisorPage />);
    // The opportunity also appears under Top recommendations, so pick it from the opportunities table.
    const table = screen.getByRole('table', { name: 'Optimization opportunities, highest saving first' });
    await user.click(within(table).getByRole('button', { name: 'Merge App Service plans' }));
    const drawer = screen.getByRole('dialog', { name: 'Merge App Service plans' });
    expect(within(drawer).getByText(/doesn’t change cloud resources/)).toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('button', { name: 'Merge App Service plans' })).not.toBeInTheDocument();
    expect(screen.getByText('1 dismissed')).toBeInTheDocument();
  });

  it('Reserved Instances lists the nearest expiry first and labels recommendations as estimates', () => {
    wrap(<ReservationsPage />);
    const names = screen.getAllByRole('row').slice(1).map((row) => row.querySelector('button')?.textContent);
    const ends = cloudInsightsRepository.listReservations().sort((a, b) => a.end.localeCompare(b.end)).map((r) => r.name);
    expect(names).toEqual(ends);
    expect(screen.getByText(/Not a purchase/)).toBeInTheDocument();
  });

  it('Savings overview has the trend, category donut, top recommendations, optimization breakdown and MSP rates', () => {
    wrap(<OptimizationAdvisorPage />);
    for (const name of ['Savings trend', 'Savings by category', 'Top recommendations', 'Savings by Optimization (you can control)', 'Maitsys MSP Savings (per-provider rates)']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    const msp = screen.getByRole('table', { name: /Maitsys discount rate, monthly spend and monthly saving per provider/ });
    const rows = within(msp).getAllByRole('row').map((r) => r.textContent ?? '');
    expect(rows.find((r) => r.startsWith('Azure'))).toContain('7.0%');
    expect(rows.find((r) => r.startsWith('AWS'))).toContain('3.5%');
    expect(rows.find((r) => r.startsWith('SAP BTP'))).toContain('2.0%');
    expect(rows.find((r) => r.startsWith('Google Cloud'))).toContain('2.0%');
    expect(rows[rows.length - 1]).toMatch(/^Total/);
  });

  it('Top recommendations are ranked by monthly saving and open the opportunity detail', async () => {
    const user = userEvent.setup();
    wrap(<OptimizationAdvisorPage />);
    const list = screen.getByRole('list', { name: 'Top recommendations by monthly saving' });
    const savings = within(list).getAllByRole('listitem').map((li) => Number((li.querySelector('strong')?.textContent ?? '').replace(/[^0-9.]/g, '')));
    expect(savings.length).toBe(5);
    expect([...savings].sort((a, b) => b - a)).toEqual(savings);
    const first = within(list).getAllByRole('listitem')[0];
    expect(first).toHaveTextContent(/Effort: (Low|Medium|High)/);
    await user.click(within(first).getByRole('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('the provider filter limits every figure on the page', async () => {
    const user = userEvent.setup();
    wrap(<OptimizationAdvisorPage />);
    const totalAmount = () => screen.getByText('Total Amount').closest('.mv-kpi')?.querySelector('.mv-kpi-value')?.textContent;
    const allTotal = totalAmount();
    await user.click(screen.getByLabelText('Provider'));
    await user.click(screen.getByRole('option', { name: 'Amazon AWS' }));

    expect(totalAmount()).not.toBe(allTotal);
    const msp = screen.getByRole('table', { name: /Maitsys discount rate/ });
    expect(within(msp).queryByText('Azure')).not.toBeInTheDocument();
    expect(within(msp).getByText('AWS')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Top recommendations by monthly saving' });
    expect(within(list).queryByText(/Azure ·/)).not.toBeInTheDocument();
    expect(within(list).getAllByText(/AWS ·/).length).toBeGreaterThan(0);
    // The opportunity list below follows the same filter.
    const table = screen.getByRole('table', { name: 'Optimization opportunities, highest saving first' });
    expect(within(table).queryByText('Merge App Service plans')).not.toBeInTheDocument();
    expect(within(table).getByText('Buy a 1-year Compute Savings Plan')).toBeInTheDocument();
  });

  it('keeps SAP BTP and Google Cloud out of an organisation that is not subscribed to them', () => {
    wrap(<OptimizationAdvisorPage />);
    const msp = screen.getByRole('table', { name: /Maitsys discount rate/ });
    expect(msp).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Optimization opportunities, highest saving first' });
    expect(within(table).queryByText(/Move from pay-as-you-go to the CPEA/)).not.toBeInTheDocument();
    expect(within(table).queryByText(/Delete idle Compute Engine/)).not.toBeInTheDocument();
  });

  describe('Recalculate savings', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('shows progress, then updates the last recalculated time, nudges optimisation numbers and fires a toast', () => {
      const toasts: string[] = [];
      const listener = (e: Event) => toasts.push((e as CustomEvent<{ message: string }>).detail.message);
      window.addEventListener('ccm:toast', listener);
      wrap(<OptimizationAdvisorPage />);
      const potential = () => screen.getByText('Total Savings (Potential)').closest('.mv-kpi')?.querySelector('.mv-kpi-value')?.textContent;
      const before = potential();
      const mspBefore = screen.getByRole('table', { name: /Maitsys discount rate/ }).textContent;

      fireEvent.click(screen.getByRole('button', { name: 'Recalculate savings' }));
      expect(screen.getByRole('button', { name: 'Recalculating…' })).toBeDisabled();
      expect(screen.getByRole('progressbar', { name: 'Recalculating savings' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Recalculating savings…');

      act(() => { vi.advanceTimersByTime(1300); });
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Recalculate savings' })).toBeEnabled();
      expect(screen.getByRole('status')).toHaveTextContent(/Last recalculated \d{1,2}:\d{2}/);
      expect(potential()).not.toBe(before);
      expect(screen.getByRole('table', { name: /Maitsys discount rate/ }).textContent).toBe(mspBefore);
      expect(toasts).toContain('Savings recalculated.');
      window.removeEventListener('ccm:toast', listener);
    });
  });
});
