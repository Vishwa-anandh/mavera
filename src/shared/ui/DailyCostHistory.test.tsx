import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cloneElement, type ReactElement } from 'react';
import { DailyCostHistory } from './DailyCostHistory';
import { ThemeProvider } from '../theme/ThemeProvider';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactElement<Record<string, unknown>> }) => <div style={{ width: 400, height: 200 }}>{cloneElement(children, { width: 400, height: 200 })}</div> };
});

/** 40 days ending 2026-09-27: every day costs 10, except the last day, which costs 50. */
const series = Array.from({ length: 40 }, (_, i) => {
  const date = new Date(2026, 8, 27 - (39 - i));
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { date: iso, cost: i === 39 ? 50 : 10 };
});

const renderPanel = (props: Partial<React.ComponentProps<typeof DailyCostHistory>> = {}) =>
  render(<ThemeProvider><DailyCostHistory series={series} {...props} /></ThemeProvider>);

describe('DailyCostHistory', () => {
  it('is a labelled section with a 7d, 14d and 30d range switch of pressed-state buttons', () => {
    renderPanel();
    expect(screen.getByRole('region', { name: 'Daily Cost History' })).toBeInTheDocument();
    const range = screen.getByRole('group', { name: 'Date range' });
    expect(within(range).getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(range).getByRole('button', { name: 'Last 14 days' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(range).getByRole('button', { name: 'Last 30 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('recomputes the total, average and peak day for the chosen range, and announces them politely', async () => {
    const user = userEvent.setup();
    renderPanel();
    const summary = document.querySelector('.mv-daily-history-summary') as HTMLElement;
    expect(summary).toHaveAttribute('aria-live', 'polite');
    // 30 days: 29 x 10 + 50 = 340.
    expect(summary).toHaveTextContent('$340.00');
    expect(summary).toHaveTextContent('$11.33');
    expect(summary).toHaveTextContent('$50.00 on Sep 27');

    await user.click(screen.getByRole('button', { name: 'Last 7 days' }));
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute('aria-pressed', 'false');
    // 7 days: 6 x 10 + 50 = 110.
    expect(summary).toHaveTextContent('$110.00');
    expect(summary).toHaveTextContent('$15.71');

    await user.click(screen.getByRole('button', { name: 'Last 14 days' }));
    expect(summary).toHaveTextContent('$180.00');
  });

  it('names the chart for the number of days shown', async () => {
    const user = userEvent.setup();
    renderPanel();
    expect(screen.getByRole('img', { name: 'Daily Cost History, last 30 days' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Last 14 days' }));
    expect(screen.getByRole('img', { name: 'Daily Cost History, last 14 days' })).toBeInTheDocument();
  });

  it('switches between the bar and area views', async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();
    expect(screen.getByRole('button', { name: 'Bar chart' })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.recharts-bar')).toBeInTheDocument();
    expect(container.querySelector('.recharts-area')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Area chart' }));
    expect(screen.getByRole('button', { name: 'Area chart' })).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.recharts-area')).toBeInTheDocument();
    expect(container.querySelector('.recharts-bar')).not.toBeInTheDocument();
  });

  it('lists exactly the days in the range in a keyboard-reachable data table, and closes with Escape', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Last 7 days' }));
    await user.click(screen.getByRole('button', { name: 'View data' }));
    const dialog = screen.getByRole('dialog', { name: 'Daily Cost History, last 7 days' });
    expect(within(dialog).getAllByRole('row')).toHaveLength(8); // header + 7 days
    expect(within(dialog).getByRole('cell', { name: 'Sep 27, 2026' })).toBeInTheDocument();
    expect(within(dialog).getByRole('cell', { name: '$50.00' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses a shorter series as it is when it has fewer days than the range', () => {
    renderPanel({ series: series.slice(-3) });
    expect(screen.getByRole('img', { name: 'Daily Cost History, last 3 days' })).toBeInTheDocument();
  });

  it('says so instead of drawing an empty chart', () => {
    renderPanel({ series: [] });
    expect(screen.getByText('No daily cost data is available for this period.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View data' })).not.toBeInTheDocument();
  });

  it('can sit under an h2 group heading as an h3', () => {
    renderPanel({ headingLevel: 'h3' });
    expect(screen.getByRole('heading', { level: 3, name: 'Daily Cost History' })).toBeInTheDocument();
  });
});
