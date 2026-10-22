import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardToolbar } from './DashboardToolbar';

describe('DashboardToolbar', () => {
  it('has no controls that change nothing: no free-text search box and no scope selects', () => {
    render(<DashboardToolbar onRefresh={() => {}} />);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /time range|environment|all systems/i })).not.toBeInTheDocument();
  });

  it('opens the command palette, as Ctrl+K does, from the search button', async () => {
    const seen = vi.fn();
    const listener = (event: KeyboardEvent) => seen(event.key, event.ctrlKey);
    document.addEventListener('keydown', listener);
    try {
      render(<DashboardToolbar onRefresh={() => {}} />);
      await userEvent.setup().click(screen.getByRole('button', { name: /Search systems, resources, alerts/ }));
      expect(seen).toHaveBeenCalledWith('k', true);
    } finally {
      document.removeEventListener('keydown', listener);
    }
  });

  it('words the search for the modules the organisation has', () => {
    render(<DashboardToolbar onRefresh={() => {}} modules={{ cloudCost: false, sapMonitoring: true }} />);
    expect(screen.getByRole('button', { name: /Search systems, jobs, alerts/ })).toBeInTheDocument();
  });

  it('refreshes the dashboard data', async () => {
    const onRefresh = vi.fn();
    render(<DashboardToolbar onRefresh={onRefresh} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
