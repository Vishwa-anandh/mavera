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
      expect(within(history).getByRole('img', { name: 'Daily Cost History, last 30 days' })).toBeInTheDocument();

      await user.click(within(range).getByRole('button', { name: 'Last 7 days' }));
      expect(within(history).getByRole('img', { name: 'Daily Cost History, last 7 days' })).toBeInTheDocument();
      expect(within(range).getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('keeps the other Operations sections', async () => {
      const user = setup();
      await user.click(view(/^Operations/));
      for (const name of ['Monthly Spend by Service', 'Cost Insights', 'Top Services', 'By Resource Group', 'By Region', 'Cost Movers']) {
        expect(screen.getByRole('heading', { name })).toBeInTheDocument();
      }
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
      const existing = ['Top Resources by Cost', 'Resource Inventory', 'By Resource Group', 'By Location', 'Reservation Utilization (Daily)', 'Raw Invoices'];
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
