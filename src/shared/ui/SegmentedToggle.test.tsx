import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentedToggle } from './SegmentedToggle';

const options = [
  { value: '7D', label: '7D', ariaLabel: 'Last 7 days' },
  { value: '30D', label: '30D', ariaLabel: 'Last 30 days' },
] as const;

describe('SegmentedToggle', () => {
  it('is a group of pressed-state buttons, not tabs', () => {
    render(<SegmentedToggle label="Spend period" options={[...options]} value="7D" onChange={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Spend period' })).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the chosen option', async () => {
    const onChange = vi.fn();
    render(<SegmentedToggle label="Spend period" options={[...options]} value="7D" onChange={onChange} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Last 30 days' }));
    expect(onChange).toHaveBeenCalledWith('30D');
  });
});
