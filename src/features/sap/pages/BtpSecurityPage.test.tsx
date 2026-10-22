import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { subscribeToToasts, type ToastDetail } from '../../../shared/lib/toastEvents';
import { BtpSecurityPage } from './BtpSecurityPage';

const renderPage = (path = '/') => render(<ThemeProvider><MemoryRouter initialEntries={[path]}><BtpSecurityPage /></MemoryRouter></ThemeProvider>);

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.useRealTimers());

describe('BtpSecurityPage', () => {
  it('has Users, Role Collections and Roles as tabs, with the last one used remembered', async () => {
    const user = userEvent.setup();
    const first = renderPage();
    expect(screen.getAllByRole('tab').map((t) => t.firstChild?.textContent)).toEqual(['Users', 'Role Collections', 'Roles']);
    expect(screen.getByRole('tab', { name: /^Users/ })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: /^Roles/ }));
    first.unmount();
    renderPage();
    expect(screen.getByRole('tab', { name: /^Roles/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('says there is nothing to list instead of showing an empty table', () => {
    renderPage();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No users found' })).toBeInTheDocument();
  });

  it('Refresh reads the assessment again and says what came back', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const toasts: ToastDetail[] = [];
    const unsubscribe = subscribeToToasts((detail) => toasts.push(detail));
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderPage();
      await user.click(screen.getAllByRole('button', { name: 'Refresh' })[0]);
      expect(screen.getAllByRole('button', { name: 'Refreshing…' })[0]).toBeDisabled();
      act(() => { vi.advanceTimersByTime(700); });
      expect(screen.getAllByRole('button', { name: 'Refresh' })[0]).toBeEnabled();
      expect(toasts.at(-1)?.message).toMatch(/BTP security refreshed/);
    } finally {
      unsubscribe();
    }
  });
});
