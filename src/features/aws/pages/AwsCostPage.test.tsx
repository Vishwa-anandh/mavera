import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { AwsAccountProvider } from '../model/AwsAccountContext';
import { AwsCostPage } from './AwsCostPage';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 600, height: 240 }}>{children}</div> };
});

function setup() {
  render(
    <ThemeProvider>
      <AwsAccountProvider>
        <MemoryRouter initialEntries={['/aws/account/aws-acc-1']}>
          <Routes><Route path="/aws/account/:accountId" element={<AwsCostPage />} /></Routes>
        </MemoryRouter>
      </AwsAccountProvider>
    </ThemeProvider>,
  );
  return userEvent.setup();
}

const view = (name: RegExp) => screen.getByRole('button', { name });
const money = (text: string | null) => Number((text ?? '').replace(/[$,]/g, ''));
/** The dollar amounts in a piece of text, in order. */
const amounts = (text: string | null) => (text ?? '').match(/\$[\d,]+\.\d{2}/g)?.map(money) ?? [];

describe('AWS account page', () => {
  describe('Executive view', () => {
    it('keeps the existing sections and adds the Service Category Summary', () => {
      setup();
      for (const name of ['Financial Snapshot', 'AI Executive Summary', 'Top 5 Cost Drivers', 'Attention Center']) {
        expect(screen.getByRole('heading', { name })).toBeInTheDocument();
      }
      const summary = screen.getByRole('region', { name: 'Service Category Summary' });
      expect(within(summary).getByRole('button', { name: /^Compute, \d+ services?$/ })).toBeInTheDocument();
      expect(within(summary).getByRole('row', { name: /^Total/ })).toHaveTextContent('100.0%');
    });

    it('lists the small service line items under their category', async () => {
      const user = setup();
      const summary = screen.getByRole('region', { name: 'Service Category Summary' });
      await user.click(within(summary).getByRole('button', { name: /^Security, 1 service$/ }));
      expect(within(summary).getByRole('cell', { name: 'AWS WAF' })).toBeInTheDocument();
      await user.click(within(summary).getByRole('button', { name: /^Support and billing, 2 services$/ }));
      expect(within(summary).getByRole('cell', { name: 'Tax' })).toBeInTheDocument();
    });

    it('has one spend summary above the views and no second KPI strip', () => {
      setup();
      const summary = screen.getByRole('region', { name: 'Spend summary' });
      for (const label of ['Month-to-date spend', 'Forecast', 'Daily pace', 'Maitsys CSP savings']) expect(within(summary).getByText(label)).toBeInTheDocument();
      expect(within(summary).getByText('Projected')).toBeInTheDocument();
      expect(within(summary).getByText('Active service types')).toBeInTheDocument();
      expect(within(summary).getByText('Total resources')).toBeInTheDocument();
      expect(screen.queryByText('Amount Payable')).not.toBeInTheDocument();
      expect(screen.queryByText('Total Savings')).not.toBeInTheDocument();
      expect(document.querySelector('.mv-kpi-row-5')).not.toBeInTheDocument();
    });

    it('shows a compact Service Breakdown after the Service Category Summary that ties to it', async () => {
      const user = setup();
      const category = screen.getByRole('region', { name: 'Service Category Summary' });
      const breakdown = screen.getByRole('region', { name: 'Service Breakdown' });
      expect(category.compareDocumentPosition(breakdown) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      expect(breakdown.querySelectorAll('.mv-svc-item')).toHaveLength(8);
      expect(within(breakdown).getByText(/^Top 8 of 11 service types/)).toBeInTheDocument();
      await user.click(within(breakdown).getByRole('button', { name: 'Show all 11 services' }));
      expect(breakdown.querySelectorAll('.mv-svc-item')).toHaveLength(11);

      const total = amounts(within(category).getByRole('row', { name: /^Total/ }).textContent)[0];
      const costs = [...breakdown.querySelectorAll('.mv-svc-row .mv-svc-cost')].map((cell) => money(cell.textContent));
      expect(costs.reduce((sum, cost) => sum + cost, 0)).toBeCloseTo(total, 2);

      // A service opens to its usage lines with the CSP saving.
      await user.click(within(breakdown).getAllByRole('button', { expanded: false })[0]);
      expect(breakdown.querySelector('.mv-svc-saving')).toBeInTheDocument();
    });

    it('shows the resource inventory by type with counts and shares', () => {
      setup();
      const inventory = screen.getByRole('heading', { name: 'Resource Inventory' }).closest('section') as HTMLElement;
      const items = within(within(inventory).getByRole('list', { name: 'Resources by type' })).getAllByRole('listitem');
      expect(items[0]).toHaveTextContent('Security Groups');
      expect(items[0]).toHaveTextContent('24');
      expect(items[0]).toHaveTextContent('% of resources');
      expect(within(inventory).getByText('EC2 Instances')).toBeInTheDocument();
      expect(within(inventory).getByText('S3 Buckets')).toBeInTheDocument();
    });
  });

  describe('Operations view', () => {
    it('adds Daily Cost History with a 7d | 14d | 30d switch beside the existing sections', async () => {
      const user = setup();
      await user.click(view(/^Operations/));
      const history = screen.getByRole('region', { name: 'Daily Cost History' });
      const range = within(history).getByRole('group', { name: 'Date range' });
      expect(within(range).getByRole('button', { name: 'Last 30 days' })).toHaveAttribute('aria-pressed', 'true');
      await user.click(within(range).getByRole('button', { name: 'Last 14 days' }));
      expect(within(history).getByRole('img', { name: 'Daily total, last 14 days' })).toBeInTheDocument();
      expect(within(history).getByRole('img', { name: 'Daily cost by service, last 14 days' })).toBeInTheDocument();
      for (const name of ['Monthly Spend by Service', 'Top Services by Spend', 'Cost by Region', 'EC2 Instances', 'Cost Movers', 'Budgets']) {
        expect(screen.getByRole('heading', { name })).toBeInTheDocument();
      }
    });

    it('draws this month with its forecast: actual and projected days', async () => {
      const user = setup();
      await user.click(view(/^Operations/));
      const history = screen.getByRole('region', { name: 'Daily Cost History' });
      const legend = within(history).getByRole('list', { name: 'Legend' });
      expect(within(legend).getByText('Actual cost')).toBeInTheDocument();
      expect(within(legend).getByText('Projected forecast')).toBeInTheDocument();
      expect(within(history).getByText(/projected for the other 3 days/)).toBeInTheDocument();
    });

    it('lists the full Service Breakdown here, not the compact one', async () => {
      const user = setup();
      await user.click(view(/^Operations/));
      const breakdown = screen.getByRole('region', { name: 'Service Breakdown' });
      expect(breakdown.querySelectorAll('.mv-svc-item')).toHaveLength(11);
      expect(within(breakdown).queryByRole('button', { name: /^Show all/ })).not.toBeInTheDocument();
    });

    it('shows Cost by Region as a donut beside a ranked list of every region, folding past eight behind Show all', async () => {
      const user = setup();
      await user.click(view(/^Operations/));
      const panel = screen.getByRole('region', { name: 'Cost by Region' });
      expect(within(panel).getByRole('img', { name: /^Cost by Region: .*Other/ })).toBeInTheDocument();
      const list = within(panel).getByRole('list', { name: 'Cost by Region, ranked' });
      expect(within(list).getAllByRole('listitem')).toHaveLength(8);
      await user.click(within(panel).getByRole('button', { name: 'Show all 9 regions' }));
      const rows = within(list).getAllByRole('listitem');
      expect(rows).toHaveLength(9);
      // The regions add up to the month-to-date spend shown in the summary.
      const summary = screen.getByRole('region', { name: 'Spend summary' });
      const monthToDate = amounts(within(summary).getByText('Month-to-date spend').closest('article')!.textContent)[0];
      const sum = rows.reduce((total, row) => total + money(row.querySelector('.mv-region-cost')!.textContent), 0);
      expect(sum).toBeCloseTo(monthToDate, 1);
      expect(within(panel).getByRole('button', { name: 'Show fewer regions' })).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Technical view', () => {
    it('groups the view under headings and has Daily Cost History with the daily total and a stack by service', async () => {
      const user = setup();
      await user.click(view(/^Technical/));
      for (const name of ['Spend over time', 'Cost breakdown', 'Savings and budgets', 'Resources']) {
        expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
      }
      const history = screen.getByRole('region', { name: 'Daily Cost History' });
      expect(within(history).getByRole('img', { name: 'Daily cost, this month' })).toBeInTheDocument();
      expect(within(history).getByRole('img', { name: 'Daily total, last 30 days' })).toBeInTheDocument();
      await user.click(within(history).getByRole('button', { name: 'Last 7 days' }));
      expect(within(history).getByRole('img', { name: 'Daily cost by service, last 7 days' })).toBeInTheDocument();
      expect(within(history).queryByRole('button', { name: 'Area chart' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Daily Cost Trend' })).not.toBeInTheDocument();
    });

    it('keeps the existing sections', async () => {
      const user = setup();
      await user.click(view(/^Technical/));
      for (const name of ['Monthly Spend by Service', 'Cost by Service', 'Top Services by Spend', 'Cost by Region', 'Maitsys CSP Savings Opportunities', 'Cost Movers', 'Detailed Cost Breakdown', 'EC2 Instances', 'Budgets']) {
        expect(screen.getByRole('heading', { name })).toBeInTheDocument();
      }
      expect(screen.getByRole('heading', { name: /^Annual Cost Trend/ })).toBeInTheDocument();
    });
  });
});
