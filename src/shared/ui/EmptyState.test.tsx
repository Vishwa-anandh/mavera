import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders heading and explanation, and hides the action when none is given', () => {
    render(
      <EmptyState
        icon={<span>icon</span>}
        heading="No dumps in this period"
        explanation="Try a wider date range."
      />,
    );
    expect(screen.getByText('No dumps in this period')).toBeInTheDocument();
    expect(screen.getByText('Try a wider date range.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders and fires the action when provided', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(
      <EmptyState
        icon={<span>icon</span>}
        heading="No integrations"
        explanation="Connect a cloud account to get started."
        actionLabel="Add system"
        onAction={onAction}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Add system' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
