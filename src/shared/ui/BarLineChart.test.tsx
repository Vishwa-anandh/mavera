import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { BarLineChart } from './BarLineChart';
import { ThemeProvider } from '../theme/ThemeProvider';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 400, height: 200 }}>{children}</div> };
});

const data = [
  { name: 'Aug', azure: 1000, aws: 500, saving: 85 },
  { name: 'Sep', azure: 2000, aws: 0, saving: 140 },
];
const bars = [{ key: 'azure', label: 'Azure' }, { key: 'aws', label: 'AWS' }];
const money = (v: number) => `$${v.toFixed(2)}`;

const renderChart = (props: Partial<React.ComponentProps<typeof BarLineChart>> = {}) =>
  render(<ThemeProvider><BarLineChart title="Invoices vs saving" data={data} bars={bars} line={{ key: 'saving', label: 'Saving' }} format={money} {...props} /></ThemeProvider>);

describe('BarLineChart', () => {
  it('labels the chart for assistive tech', () => {
    renderChart();
    expect(screen.getByRole('img', { name: 'Invoices vs saving' })).toBeInTheDocument();
  });

  it('offers every bar and line value in a keyboard-reachable data table', async () => {
    const user = userEvent.setup();
    renderChart();
    await user.click(screen.getByRole('button', { name: 'View data' }));
    const dialog = screen.getByRole('dialog', { name: 'Invoices vs saving' });
    expect(within(dialog).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Category', 'Azure', 'AWS', 'Saving']);
    expect(within(dialog).getAllByRole('row').slice(1).map((r) => r.textContent)).toEqual(['Aug$1000.00$500.00$85.00', 'Sep$2000.00$0.00$140.00']);
    await user.click(within(dialog).getByRole('button', { name: 'Close data table' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses its own value format for the line', async () => {
    const user = userEvent.setup();
    renderChart({ lineFormat: (v) => `${v} saved` });
    await user.click(screen.getByRole('button', { name: 'View data' }));
    expect(within(screen.getByRole('dialog')).getByRole('cell', { name: '85 saved' })).toBeInTheDocument();
  });

  it('says so instead of drawing an empty chart', () => {
    renderChart({ data: [] });
    expect(screen.getByText('No data available for this period.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
