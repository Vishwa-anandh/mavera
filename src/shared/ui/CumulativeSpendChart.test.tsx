import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { cumulativeSeries } from '../lib/costAnalysis';
import { CumulativeSpendChart } from './CumulativeSpendChart';
import { ThemeProvider } from '../theme/ThemeProvider';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 400, height: 200 }}>{children}</div> };
});

const daily = [{ date: '2026-09-01', cost: 10 }, { date: '2026-09-02', cost: 20 }, { date: '2026-09-03', cost: 30 }];
const renderChart = (days?: number) => render(<ThemeProvider><CumulativeSpendChart title="Cumulative spend" data={cumulativeSeries(daily, days)} /></ThemeProvider>);

describe('CumulativeSpendChart', () => {
  it('labels the chart and lists every day, running total and projection in a data table', async () => {
    const user = userEvent.setup();
    renderChart(5);
    expect(screen.getByRole('img', { name: 'Cumulative spend' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View data' }));
    const dialog = screen.getByRole('dialog', { name: 'Cumulative spend' });
    expect(within(dialog).getAllByRole('row')).toHaveLength(6);
    expect(within(dialog).getAllByRole('cell', { name: '$60.00' })).toHaveLength(2); // last actual day: spend so far and the start of the projection
    expect(within(dialog).getByRole('cell', { name: '$100.00' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Close data table' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('explains the dashed projection only when there is one', () => {
    const { unmount } = renderChart(5);
    expect(screen.getByText('Projected at the current daily rate')).toBeInTheDocument();
    unmount();
    renderChart();
    expect(screen.queryByText('Projected at the current daily rate')).not.toBeInTheDocument();
  });

  it('says so when there is no spend yet', () => {
    render(<ThemeProvider><CumulativeSpendChart title="Cumulative spend" data={[]} /></ThemeProvider>);
    expect(screen.getByText('No spend history available for this period.')).toBeInTheDocument();
  });
});
