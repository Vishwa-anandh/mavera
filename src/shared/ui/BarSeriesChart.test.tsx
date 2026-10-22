import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { BarSeriesChart } from './BarSeriesChart';
import { ThemeProvider } from '../theme/ThemeProvider';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 400, height: 200 }}>{children}</div> };
});

const data = [
  { name: 'HANA-PRD', cpu: 92, memory: 88 },
  { name: 'S4H-QA', cpu: 18, memory: 22 },
];
const series = [{ key: 'cpu', label: 'CPU' }, { key: 'memory', label: 'Memory' }];

const renderChart = (props: Partial<React.ComponentProps<typeof BarSeriesChart>> = {}) =>
  render(<ThemeProvider><BarSeriesChart title="CPU and memory by system" data={data} series={series} format={(v) => `${v}%`} {...props} /></ThemeProvider>);

describe('BarSeriesChart', () => {
  it('labels the chart for assistive tech', () => {
    renderChart();
    expect(screen.getByRole('img', { name: 'CPU and memory by system' })).toBeInTheDocument();
  });

  it('offers every value in a keyboard-reachable data table', async () => {
    const user = userEvent.setup();
    renderChart();
    await user.click(screen.getByRole('button', { name: 'View data' }));
    const dialog = screen.getByRole('dialog', { name: 'CPU and memory by system' });
    expect(within(dialog).getByRole('columnheader', { name: 'CPU' })).toBeInTheDocument();
    expect(within(dialog).getByRole('cell', { name: '92%' })).toBeInTheDocument();
    expect(within(dialog).getByRole('cell', { name: 'S4H-QA' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Close data table' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the data table with Escape, keeps Tab inside it and returns focus to View data', async () => {
    const user = userEvent.setup();
    renderChart();
    const opener = screen.getByRole('button', { name: 'View data' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'CPU and memory by system' });
    const close = within(dialog).getByRole('button', { name: 'Close data table' });
    expect(close).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('says so instead of drawing an empty chart', () => {
    renderChart({ data: [] });
    expect(screen.getByText('No data available for this period.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
