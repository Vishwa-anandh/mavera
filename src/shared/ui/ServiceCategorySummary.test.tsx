import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { groupByCategory } from '../lib/costAnalysis';
import { ServiceCategorySummary } from './ServiceCategorySummary';
import { ThemeProvider } from '../theme/ThemeProvider';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 400, height: 200 }}>{children}</div> };
});

const services = [
  { name: 'Virtual Machines', cost: 600 },
  { name: 'Kubernetes', cost: 100 },
  { name: 'SQL Database', cost: 250 },
  { name: 'Redis', cost: 50 },
];
const summary = groupByCategory(services, (name) => (/sql|redis/i.test(name) ? 'Databases' : 'Compute'));

const renderSummary = (value = summary) => render(<ThemeProvider><ServiceCategorySummary summary={value} /></ThemeProvider>);

describe('ServiceCategorySummary', () => {
  it('shows the category chart and a Category, Services, Total Cost and Share table', () => {
    renderSummary();
    expect(screen.getByRole('region', { name: 'Service Category Summary' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Spend by service category' })).toBeInTheDocument();
    for (const name of ['Category', 'Services', 'Total Cost', 'Share']) expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByRole('button', { name: 'Compute, 2 services' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: '$700.00' })).toBeInTheDocument();
    expect(within(rows[1]).getByRole('cell', { name: '70.0%' })).toBeInTheDocument();
    expect(within(rows[2]).getByRole('cell', { name: '30.0%' })).toBeInTheDocument();
  });

  it('ends with a total row whose shares add up to 100%', () => {
    renderSummary();
    const total = screen.getByRole('row', { name: /^Total/ });
    expect(within(total).getByRole('cell', { name: '$1,000.00' })).toBeInTheDocument();
    expect(within(total).getByRole('cell', { name: '100.0%' })).toBeInTheDocument();
  });

  it('opens a category to its services, with monthly cost and share of the total, and closes it again', async () => {
    const user = userEvent.setup();
    renderSummary();
    const toggle = screen.getByRole('button', { name: 'Compute, 2 services' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('cell', { name: 'Virtual Machines' })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const vmRow = screen.getByRole('row', { name: /Virtual Machines/ });
    expect(within(vmRow).getByRole('cell', { name: '$600.00' })).toBeInTheDocument();
    expect(within(vmRow).getByRole('cell', { name: '60.0%' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Kubernetes/ })).toBeInTheDocument();
    // Another category stays closed.
    expect(screen.queryByRole('cell', { name: 'SQL Database' })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('cell', { name: 'Virtual Machines' })).not.toBeInTheDocument();
  });

  it('can be driven from the keyboard', async () => {
    const user = userEvent.setup();
    renderSummary();
    screen.getByRole('button', { name: 'Compute, 2 services' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('cell', { name: 'Virtual Machines' })).toBeInTheDocument();
  });

  it('says so when there is nothing to group', () => {
    renderSummary(groupByCategory([], () => 'Other'));
    expect(screen.getByText('No services to group yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
