import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { AzureCostPage } from './AzureCostPage';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 600, height: 240 }}>{children}</div> };
});

function setup() {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/azure/az-acc-1']}>
        <Routes><Route path="/azure/:accountId" element={<AzureCostPage />} /></Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
  return userEvent.setup();
}

const view = (name: RegExp) => screen.getByRole('button', { name });
const money = (text: string | null) => Number((text ?? '').replace(/[$,]/g, ''));
/** The dollar amounts in a piece of text, in order. */
const amounts = (text: string | null) => (text ?? '').match(/\$[\d,]+\.\d{2}/g)?.map(money) ?? [];

describe('Azure account page', () => {
  describe('Executive view', () => {
    it('keeps the existing sections and adds the Service Category Summary', () => {
      setup();
      for (const name of ['Financial Snapshot', 'AI Executive Summary', 'Top 5 Cost Drivers', 'Attention Center']) {
        expect(screen.getByRole('heading', { name })).toBeInTheDocument();
      }
      const summary = screen.getByRole('region', { name: 'Service Category Summary' });
      expect(within(summary).getByRole('img', { name: 'Spend by service category' })).toBeInTheDocument();
      expect(within(summary).getByRole('button', { name: /^Compute, \d+ services?$/ })).toBeInTheDocument();
      expect(within(summary).getByRole('row', { name: /^Total/ })).toHaveTextContent('100.0%');
    });

    it('has one spend summary above the views: no Amount Payable or Total Savings repeating the forecast and the CSP saving', () => {
      setup();
      const summary = screen.getByRole('region', { name: 'Spend summary' });
      for (const label of ['Month-to-date spend', 'Forecast', 'Daily pace', 'Maitsys CSP savings']) expect(within(summary).getByText(label)).toBeInTheDocument();
      expect(within(summary).getByText('Projected')).toBeInTheDocument();
      expect(within(summary).getByText('Enabled services')).toBeInTheDocument();
      expect(within(summary).getByText('Total resources')).toBeInTheDocument();
      expect(within(summary).getByText(/7% CSP discount/)).toBeInTheDocument();
      expect(screen.queryByText('Amount Payable')).not.toBeInTheDocument();
      expect(screen.queryByText('Total Savings')).not.toBeInTheDocument();
      expect(document.querySelectorAll('.mv-kpi-row-4, .mv-kpi-row-5')).toHaveLength(0);
      // The figures themselves are unchanged: month to date and its forecast.
      expect(summary).toHaveTextContent('$14,280.55');
      expect(summary).toHaveTextContent('$15,867.28');
    });

    it('shows a compact Service Breakdown after the Service Category Summary, with meters that tie to it', async () => {
      const user = setup();
      const category = screen.getByRole('region', { name: 'Service Category Summary' });
      const breakdown = screen.getByRole('region', { name: 'Service Breakdown' });
      expect(category.compareDocumentPosition(breakdown) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      // Eight services fit in the compact list, so there is nothing to expand.
      expect(breakdown.querySelectorAll('.mv-svc-item')).toHaveLength(8);
      expect(within(breakdown).queryByRole('button', { name: /^Show all/ })).not.toBeInTheDocument();

      const total = amounts(within(category).getByRole('row', { name: /^Total/ }).textContent)[0];
      const costs = [...breakdown.querySelectorAll('.mv-svc-row .mv-svc-cost')].map((cell) => money(cell.textContent));
      expect(costs.reduce((sum, cost) => sum + cost, 0)).toBeCloseTo(total, 2);

      // A service opens to its meters, and they add up to the service.
      const first = breakdown.querySelector('.mv-svc-item') as HTMLElement;
      await user.click(within(first).getByRole('button'));
      const meters = [...first.querySelectorAll('.mv-svc-lines > li:not(.mv-svc-lines-note) .mv-svc-cost')].map((cell) => money(cell.textContent));
      expect(meters.length).toBeGreaterThan(1);
      expect(meters.reduce((sum, cost) => sum + cost, 0)).toBeCloseTo(money(first.querySelector('.mv-svc-row .mv-svc-cost')!.textContent), 2);
      expect(first.querySelector('.mv-svc-saving')).toBeInTheDocument();
    });

    it('shows the top resources and expands to every resource', async () => {
      const user = setup();
      const section = screen.getByRole('heading', { name: 'Resources by Cost' }).closest('section') as HTMLElement;
      const collapsed = within(section).getAllByRole('row').length;
      const toggle = within(section).getByRole('button', { name: /^Show all \d+ resources$/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(collapsed).toBe(9);

      await user.click(toggle);
      expect(within(section).getAllByRole('row').length).toBeGreaterThan(collapsed);
      expect(within(section).getByRole('button', { name: 'Show fewer resources' })).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Operations view', () => {
    it('calls the daily chart Daily Cost History and offers a 7d | 14d | 30d switch', async () => {
      const user = setup();
      await user.click(view(/^Operations/));
      const history = screen.getByRole('region', { name: 'Daily Cost History' });
      expect(screen.queryByRole('heading', { name: 'Daily Cost Trend' })).not.toBeInTheDocument();
      const range = within(history).getByRole('group', { name: 'Date range' });
      expect(within(range).getByRole('button', { name: 'Last 30 days' })).toHaveAttribute('aria-pressed', 'true');
      // The month-to-date series is padded back to 30 days with the end of the previous month.
      expect(within(history).getByRole('img', { name: 'Daily total, last 30 days' })).toBeInTheDocument();
      expect(within(history).getByRole('img', { name: 'Daily cost, this month' })).toBeInTheDocument();

      await user.click(within(range).getByRole('button', { name: 'Last 7 days' }));
      expect(within(history).getByRole('img', { name: 'Daily total, last 7 days' })).toBeInTheDocument();
      expect(within(history).getByRole('img', { name: 'Daily cost by service, last 7 days' })).toBeInTheDocument();
      expect(within(range).getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'true');
      expect(within(history).queryByRole('group', { name: 'Chart type' })).not.toBeInTheDocument();
    });

    it('projects the rest of the month so that it ties to the forecast in the summary', async () => {
      const user = setup();
      await user.click(view(/^Operations/));
      const history = screen.getByRole('region', { name: 'Daily Cost History' });
      await user.click(within(history).getByRole('button', { name: /^View data: Daily cost, this month/ }));
      const dialog = screen.getByRole('dialog', { name: /^Daily cost, this month/ });
      const rows = within(dialog).getAllByRole('row').slice(1);
      const actual = rows.filter((row) => within(row).queryByRole('cell', { name: 'Actual' })).reduce((sum, row) => sum + money(within(row).getAllByRole('cell')[2].textContent), 0);
      const projected = rows.filter((row) => within(row).queryByRole('cell', { name: 'Forecast' })).reduce((sum, row) => sum + money(within(row).getAllByRole('cell')[2].textContent), 0);
      expect(actual).toBeCloseTo(14280.55, 2);
      expect(actual + projected).toBeCloseTo(15867.28, 2);
      expect(rows).toHaveLength(30);
    });

    it('keeps the other Operations sections', async () => {
      const user = setup();
      await user.click(view(/^Operations/));
      for (const name of ['Monthly Spend by Service', 'Cost Insights', 'Top Services', 'By Resource Group', 'Cost by Region', 'Cost Movers']) {
        expect(screen.getByRole('heading', { name })).toBeInTheDocument();
      }
    });

    it('shows Cost by Region as a donut beside a ranked list of every location that adds up to the month to date', async () => {
      const user = setup();
      await user.click(view(/^Operations/));
      const panel = screen.getByRole('region', { name: 'Cost by Region' });
      expect(within(panel).getByRole('img', { name: /^Cost by Region: .*Other/ })).toBeInTheDocument();
      const rows = within(within(panel).getByRole('list', { name: 'Cost by Region, ranked' })).getAllByRole('listitem');
      expect(rows).toHaveLength(8);
      expect(within(panel).queryByRole('button', { name: /^Show all/ })).not.toBeInTheDocument();
      const costs = rows.map((row) => money(row.querySelector('.mv-region-cost')!.textContent));
      expect(costs).toEqual([...costs].sort((a, b) => b - a));
      expect(costs.reduce((sum, cost) => sum + cost, 0)).toBeCloseTo(14280.55, 1);
    });
  });

  describe('Technical view', () => {
    it('groups the long view under headings', async () => {
      const user = setup();
      await user.click(view(/^Technical/));
      for (const name of ['Resources and allocation', 'Spend over time', 'Savings and optimization', 'Billing']) {
        expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
      }
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    });

    it('keeps the existing sections and adds the missing ones', async () => {
      const user = setup();
      await user.click(view(/^Technical/));
      const existing = ['Top Resources by Cost', 'Resource Inventory', 'By Resource Group', 'Cost by Region', 'Reservation Utilization (Daily)', 'Raw Invoices'];
      const added = ['Annual Cost Trend', 'Temporal Spend Analysis', 'Service Distribution', 'Maitsys CSP Savings Opportunities', 'Advisor Recommendations', 'Budget Alerts'];
      for (const name of [...existing, ...added]) {
        expect(screen.getByRole('heading', { level: 3, name: new RegExp(`^${name.replace(/[()]/g, '\\$&')}`) })).toBeInTheDocument();
      }
    });

    it('shows Advisor impact and saving and the budgets that are near or over their limit', async () => {
      const user = setup();
      await user.click(view(/^Technical/));
      const advisor = screen.getByRole('list', { name: 'Azure Advisor recommendations' });
      expect(within(advisor).getAllByRole('listitem')[0]).toHaveTextContent('High impact');
      expect(within(advisor).getAllByRole('listitem')[0]).toHaveTextContent('per month');

      const budgets = screen.getByRole('list', { name: 'Budgets near or over their limit' });
      expect(within(budgets).getByText('Over budget')).toBeInTheDocument();
      expect(within(budgets).getAllByText('Near limit').length).toBeGreaterThan(0);
    });

    it('splits the service distribution donut into three services and Other', async () => {
      const user = setup();
      await user.click(view(/^Technical/));
      await user.click(within(screen.getByRole('heading', { name: 'Service Distribution' }).closest('section') as HTMLElement).getByRole('button', { name: 'View data' }));
      const dialog = screen.getByRole('dialog', { name: 'Service distribution' });
      const rows = within(dialog).getAllByRole('row');
      expect(rows).toHaveLength(5); // header + 3 services + Other
      expect(within(dialog).getByRole('cell', { name: 'Other' })).toBeInTheDocument();
    });
  });
});
