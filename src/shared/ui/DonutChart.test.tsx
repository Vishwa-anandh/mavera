import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { DonutChart } from './DonutChart';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return { ...actual, ResponsiveContainer: ({ children }: { children: ReactNode }) => <div style={{ width: 300, height: 200 }}>{children}</div> };
});

const data = [
  { label: 'Used', value: 70, color: 'var(--mv-primary)' },
  { label: 'Free', value: 30, color: 'var(--mv-success)' },
];

describe('DonutChart data table', () => {
  it('lists every slice, closes with Escape and returns focus to View data', async () => {
    const user = userEvent.setup();
    render(<DonutChart title="Memory, used and free" totalLabel="GB" data={data} />);
    const opener = screen.getByRole('button', { name: 'View data' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Memory, used and free' });
    expect(within(dialog).getByRole('cell', { name: 'Used' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Close data table' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
