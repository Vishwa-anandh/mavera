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
      expect(within(history).getByRole('img', { name: 'Daily Cost History, last 14 days' })).toBeInTheDocument();
      for (const name of ['Monthly Spend by Service', 'Top Services by Spend', 'Cost by Region', 'EC2 Instances', 'Cost Movers', 'Budgets']) {
        expect(screen.getByRole('heading', { name })).toBeInTheDocument();
      }
    });
  });

  describe('Technical view', () => {
    it('groups the view under headings and has Daily Cost History with bar and area views', async () => {
      const user = setup();
      await user.click(view(/^Technical/));
      for (const name of ['Spend over time', 'Cost breakdown', 'Savings and budgets', 'Resources']) {
        expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
      }
      const history = screen.getByRole('region', { name: 'Daily Cost History' });
      expect(within(history).getByRole('button', { name: 'Bar chart' })).toHaveAttribute('aria-pressed', 'true');
      await user.click(within(history).getByRole('button', { name: 'Area chart' }));
      expect(within(history).getByRole('button', { name: 'Area chart' })).toHaveAttribute('aria-pressed', 'true');
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
