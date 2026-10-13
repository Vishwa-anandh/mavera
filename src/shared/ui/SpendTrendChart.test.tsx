import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { SpendTrendChart } from './SpendTrendChart';
import { ThemeProvider } from '../theme/ThemeProvider';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 400, height: 240 }}>{children}</div>
    ),
  };
});

describe('SpendTrendChart', () => {
  it('shows an explanatory message instead of an empty chart when there is no data', () => {
    render(
      <ThemeProvider>
        <SpendTrendChart data={[]} />
      </ThemeProvider>,
    );
    expect(screen.getByText('No spend history available for this period.')).toBeInTheDocument();
  });

  it('renders a labelled chart region and a "View data" table alternative', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <SpendTrendChart
          data={[
            { date: '2026-09-01', amount: 120.5 },
            { date: '2026-09-02', amount: 95 },
          ]}
        />
      </ThemeProvider>,
    );
    expect(screen.getByRole('img', { name: 'Daily spend trend' })).toBeInTheDocument();

    await user.click(screen.getByText('View data'));
    expect(screen.getByRole('columnheader', { name: 'Period' })).toBeInTheDocument();
    expect(screen.getByText('2026-09-01')).toBeInTheDocument();
    expect(screen.getByText('120.50')).toBeInTheDocument();
  });
});
