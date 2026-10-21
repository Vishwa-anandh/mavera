import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { CostByRegion } from './CostByRegion';
import { ThemeProvider } from '../theme/ThemeProvider';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 200, height: 200 }}>{children}</div> };
});

const ALL = [
  { name: 'us-east-1', cost: 600 }, { name: 'us-west-2', cost: 200 }, { name: 'eu-west-1', cost: 100 }, { name: 'global', cost: 50 },
  { name: 'ap-south-1', cost: 30 }, { name: 'NoRegion', cost: 10 }, { name: 'eu-central-1', cost: 5 }, { name: 'ap-northeast-1', cost: 3 }, { name: 'sa-east-1', cost: 2 },
];
const renderPanel = (regions = ALL, props: Partial<React.ComponentProps<typeof CostByRegion>> = {}) =>
  render(<ThemeProvider><CostByRegion regions={regions} {...props} /></ThemeProvider>);
const money = (text: string | null) => Number((text ?? '').replace(/[$,]/g, ''));

describe('CostByRegion', () => {
  it('is a labelled section with a donut and a ranked list of regions, biggest first', () => {
    renderPanel();
    const panel = screen.getByRole('region', { name: 'Cost by Region' });
    expect(within(panel).getByText('9 regions · $1,000.00 month to date')).toBeInTheDocument();
    const rows = within(within(panel).getByRole('list', { name: 'Cost by Region, ranked' })).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('us-east-1');
    expect(rows[0]).toHaveTextContent('60.0%');
    expect(rows[0]).toHaveTextContent('$600.00');
    expect(rows[1]).toHaveTextContent('us-west-2');
  });

  it('shows the top four regions and Other in the donut, and says so in its accessible name', () => {
    renderPanel();
    const donut = screen.getByRole('img', { name: /^Cost by Region: / });
    expect(donut).toHaveAccessibleName('Cost by Region: us-east-1 60.0%, us-west-2 20.0%, eu-west-1 10.0%, global 5.0%, Other 5.0%');
  });

  it('folds past eight rows behind Show all N regions and unfolds every region', async () => {
    const user = userEvent.setup();
    renderPanel();
    const list = screen.getByRole('list', { name: 'Cost by Region, ranked' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(8);
    expect(within(list).queryByText('sa-east-1')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Show all 9 regions' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(within(list).getAllByRole('listitem')).toHaveLength(9);
    expect(within(list).getByText('sa-east-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer regions' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('lists every region with no control when there are eight or fewer', () => {
    renderPanel(ALL.slice(0, 8));
    expect(screen.queryByRole('button', { name: /^Show all/ })).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Cost by Region, ranked' })).getAllByRole('listitem')).toHaveLength(8);
  });

  it('keeps every row, with its cost, adding up to the total', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Show all 9 regions' }));
    const costs = screen.getAllByRole('listitem').map((row) => money(row.querySelector('.mv-region-cost')?.textContent ?? null));
    expect(costs.reduce((sum, cost) => sum + cost, 0)).toBeCloseTo(1000, 2);
  });

  it('gives every region in a keyboard-reachable data table with shares that total 100%', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole('button', { name: /^View data/ }));
    const dialog = screen.getByRole('dialog', { name: 'Cost by Region' });
    expect(within(dialog).getAllByRole('row')).toHaveLength(11); // header + 9 regions + total
    expect(within(dialog).getByRole('row', { name: /^Total 100\.0% \$1,000\.00$/ })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has no Other slice for four regions or fewer, can take another title and heading level, and says so when empty', () => {
    const { unmount } = renderPanel(ALL.slice(0, 3), { title: 'By Location', headingLevel: 'h3' });
    expect(screen.getByRole('heading', { level: 3, name: 'By Location' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^By Location: / }).getAttribute('aria-label')).not.toContain('Other');
    unmount();
    renderPanel([]);
    expect(screen.getByText('No regional cost data is available for this period.')).toBeInTheDocument();
  });
});
