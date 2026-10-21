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

const iso = (daysBack: number) => {
  const date = new Date(2026, 8, 27 - daysBack);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * 40 days ending 2026-09-27: every day costs 10 (A 5, B 3, C 1, D 1), except the last day, which costs 50
 * (A 30, B 10, C 5, D 5). A is the biggest service, then B, then C; D is the only one folded into Other.
 */
const series = Array.from({ length: 40 }, (_, i) => {
  const last = i === 39;
  return { date: iso(39 - i), cost: last ? 50 : 10, byService: last ? { A: 30, B: 10, C: 5, D: 5 } : { A: 5, B: 3, C: 1, D: 1 } };
});

const renderPanel = (props: Partial<React.ComponentProps<typeof DailyCostHistory>> = {}) =>
  render(<ThemeProvider><DailyCostHistory series={series} {...props} /></ThemeProvider>);

const openData = async (user: ReturnType<typeof userEvent.setup>, chart: string) => {
  await user.click(screen.getByRole('button', { name: new RegExp(`^View data: ${chart}`) }));
  return screen.getByRole('dialog', { name: new RegExp(`^${chart}`) });
};

describe('DailyCostHistory', () => {
  it('is a labelled section with the subtitle and a 7d, 14d and 30d range switch of pressed-state buttons', () => {
    renderPanel();
    expect(screen.getByRole('region', { name: 'Daily Cost History' })).toBeInTheDocument();
    expect(screen.getByText('Actual spend per day, by service')).toBeInTheDocument();
    const range = screen.getByRole('group', { name: 'Date range' });
    expect(within(range).getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(range).getByRole('button', { name: 'Last 14 days' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(range).getByRole('button', { name: 'Last 30 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('no longer has a Bars | Area switch: the daily total is always an area', () => {
    const { container } = renderPanel();
    expect(screen.queryByRole('group', { name: 'Chart type' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Area chart' })).not.toBeInTheDocument();
    expect(container.querySelector('.recharts-area')).toBeInTheDocument();
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
    expect(summary).toHaveTextContent('$110.00');
    expect(summary).toHaveTextContent('$15.71');

    await user.click(screen.getByRole('button', { name: 'Last 14 days' }));
    expect(summary).toHaveTextContent('$180.00');
  });

  it('names the three charts, and the daily total and the stack follow the range while the month chart does not', async () => {
    const user = userEvent.setup();
    renderPanel();
    expect(screen.getByRole('img', { name: 'Daily cost, this month' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Daily total, last 30 days' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Daily cost by service, last 30 days' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Last 14 days' }));
    expect(screen.getByRole('img', { name: 'Daily total, last 14 days' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Daily cost by service, last 14 days' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Daily cost, this month' })).toBeInTheDocument();
  });

  it('draws actual and projected bars for the month with a Today marker and a legend', () => {
    const { container } = renderPanel();
    const legends = screen.getAllByRole('list', { name: 'Legend' });
    expect(legends).toHaveLength(1);
    expect(within(legends[0]).getByText('Actual cost')).toBeInTheDocument();
    expect(within(legends[0]).getByText('Projected forecast')).toBeInTheDocument();
    expect(container.querySelector('.recharts-reference-line')).toBeInTheDocument();
    expect(container).toHaveTextContent('Today');
    // 27 actual days (Sep 1-27) and 3 projected days (Sep 28-30).
    expect(screen.getByText(/\$\d.* projected for the other 3 days/)).toBeInTheDocument();
  });

  it('lists every day of the month in the data table and labels the forecast rows', async () => {
    const user = userEvent.setup();
    renderPanel();
    const dialog = await openData(user, 'Daily cost, this month');
    const rows = within(dialog).getAllByRole('row');
    expect(rows).toHaveLength(31); // header + 30 days
    expect(within(rows[28]).getByRole('cell', { name: 'Forecast' })).toBeInTheDocument();
    expect(within(rows[30]).getByRole('cell', { name: 'Sep 30, 2026' })).toBeInTheDocument();
    expect(within(rows[27]).getByRole('cell', { name: 'Actual' })).toBeInTheDocument();
    expect(within(rows[27]).getByRole('cell', { name: '$50.00' })).toBeInTheDocument();
    expect(within(dialog).getByText('Forecast rows are projections, not billed cost.')).toBeInTheDocument();
    // Last 7 actual days average (6 x 10 + 50) / 7 = 15.71 when there is no month-end forecast.
    expect(within(rows[29]).getByRole('cell', { name: '$15.71' })).toBeInTheDocument();
  });

  it('ties the projected days to a month-end forecast when one is given', async () => {
    const user = userEvent.setup();
    renderPanel({ forecastTotal: 700 });
    const month = series.filter((point) => point.date.startsWith('2026-09')).reduce((sum, point) => sum + point.cost, 0);
    const dialog = await openData(user, 'Daily cost, this month');
    const forecastRows = within(dialog).getAllByRole('row').filter((row) => within(row).queryByRole('cell', { name: 'Forecast' }));
    const projected = forecastRows.reduce((sum, row) => sum + Number(within(row).getAllByRole('cell')[2].textContent!.replace(/[$,]/g, '')), 0);
    expect(forecastRows).toHaveLength(3);
    expect(projected).toBeCloseTo(700 - month, 2);
    expect(screen.getByText(/\$700\.00 at month end/)).toBeInTheDocument();
  });

  it('stacks the three biggest services and Other in a fixed order, named in a legend', async () => {
    const user = userEvent.setup();
    renderPanel();
    const legend = screen.getByRole('list', { name: 'Services' });
    expect(within(legend).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['A', 'B', 'C', 'Other']);

    const headers = (dialog: HTMLElement) => within(dialog).getAllByRole('columnheader').map((header) => header.textContent);
    const dialog = await openData(user, 'Daily cost by service');
    expect(headers(dialog)).toEqual(['Date', 'A', 'B', 'C', 'Other', 'Total']);
    // Each day: the three services plus Other add up to the day's total (the last day is 30 + 10 + 5 + 5 in Other).
    const lastRow = within(dialog).getAllByRole('row')[30];
    expect(within(lastRow).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['Sep 27, 2026', '$30.00', '$10.00', '$5.00', '$5.00', '$50.00']);
    await user.keyboard('{Escape}');

    // A shorter range keeps the same order and the same colours: the keys come from the whole series.
    await user.click(screen.getByRole('button', { name: 'Last 7 days' }));
    expect(within(screen.getByRole('list', { name: 'Services' })).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['A', 'B', 'C', 'Other']);
    const sevenDays = await openData(user, 'Daily cost by service');
    expect(headers(sevenDays)).toEqual(['Date', 'A', 'B', 'C', 'Other', 'Total']);
    expect(within(sevenDays).getAllByRole('row')).toHaveLength(8);
  });

  it('separates stacked segments with a 2px surface gap and gives each service its own series', () => {
    const { container } = renderPanel();
    const stack = container.querySelectorAll('.recharts-bar-rectangle path, .recharts-bar-rectangle rect');
    expect([...stack].some((rect) => rect.getAttribute('stroke-width') === '2')).toBe(true);
  });

  it('lists exactly the days in the range in a keyboard-reachable data table, and closes with Escape', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Last 7 days' }));
    const dialog = await openData(user, 'Daily total, last 7 days');
    expect(within(dialog).getAllByRole('row')).toHaveLength(8); // header + 7 days
    expect(within(dialog).getByRole('cell', { name: 'Sep 27, 2026' })).toBeInTheDocument();
    expect(within(dialog).getByRole('cell', { name: '$50.00' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses a shorter series as it is when it has fewer days than the range', () => {
    renderPanel({ series: series.slice(-3) });
    expect(screen.getByRole('img', { name: 'Daily total, last 3 days' })).toBeInTheDocument();
  });

  it('leaves out the by-service chart when the days carry no service split', () => {
    renderPanel({ series: series.map(({ date, cost }) => ({ date, cost })) });
    expect(screen.getByRole('img', { name: 'Daily total, last 30 days' })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Services' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /by service/ })).not.toBeInTheDocument();
  });

  it('has no projected days and no Today marker for a month that is over', () => {
    const complete = Array.from({ length: 31 }, (_, i) => ({ date: `2026-08-${String(i + 1).padStart(2, '0')}`, cost: 10, byService: { A: 10 } }));
    const { container } = renderPanel({ series: complete });
    expect(screen.getByRole('img', { name: 'Daily cost, August 2026' })).toBeInTheDocument();
    expect(screen.queryByText('Projected forecast')).not.toBeInTheDocument();
    expect(container.querySelector('.recharts-reference-line')).not.toBeInTheDocument();
  });

  it('says so instead of drawing an empty chart', () => {
    renderPanel({ series: [] });
    expect(screen.getByText('No daily cost data is available for this period.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View data/ })).not.toBeInTheDocument();
  });

  it('can sit under an h2 group heading as an h3', () => {
    renderPanel({ headingLevel: 'h3' });
    expect(screen.getByRole('heading', { level: 3, name: 'Daily Cost History' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: 'Daily total' })).toBeInTheDocument();
  });
});
