import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { SubscriptionExpiredPage } from './SubscriptionExpiredPage';
import { TOKEN_KEY } from '../../../data-access';
import { ThemeProvider } from '../../../shared/theme/ThemeProvider';
import { hardNavigate } from '../../../shared/lib/hardNavigate';

const navigateMock = vi.fn();
const logoutMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, get: vi.fn() } };
});

vi.mock('../../../shared/lib/hardNavigate', () => ({ hardNavigate: vi.fn() }));

vi.mock('../model/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../model/AuthContext')>();
  return { ...actual, useAuth: () => ({ logout: logoutMock }) };
});

function renderPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <SubscriptionExpiredPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('SubscriptionExpiredPage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    navigateMock.mockReset();
    logoutMock.mockReset().mockResolvedValue(undefined);
    vi.mocked(axios.get).mockReset();
    vi.mocked(hardNavigate).mockReset();
  });

  it('shows the cached subscription details (backend snake_case shape) from sessionStorage', () => {
    sessionStorage.setItem(
      'ccm_expired_sub',
      JSON.stringify({ plan_type: 'basic', expires_at: '2026-09-01T00:00:00Z', max_users: 25, ai_enabled: true }),
    );
    renderPage();
    expect(
      screen.getByText('Your Professional plan needs to be renewed to keep monitoring your cloud costs.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Your last subscription')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Current plan')).toBeInTheDocument();
  });

  it('shows the three plan tiers for comparison', () => {
    renderPage();
    expect(screen.getByText('Available plans')).toBeInTheDocument();
    ['Free', 'Professional', 'Enterprise'].forEach((name) => expect(screen.getByText(name)).toBeInTheDocument());
    expect(screen.getAllByRole('link', { name: 'Contact sales' })).toHaveLength(3);
  });

  it('does not call /auth/me when there is no stored token, and offers sign-in', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(axios.get).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('hard-reloads to / and clears the cached subscription when /auth/me succeeds (renewed)', async () => {
    localStorage.setItem(TOKEN_KEY, 'still-valid-token');
    sessionStorage.setItem('ccm_expired_sub', JSON.stringify({ plan_type: 'free' }));
    vi.mocked(axios.get).mockResolvedValue({ data: {} });

    renderPage();

    await waitFor(() => expect(hardNavigate).toHaveBeenCalledWith('/'));
    expect(sessionStorage.getItem('ccm_expired_sub')).toBeNull();
    // A router navigate would leave AuthProvider's user null and bounce to /login.
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('stays on the page when the background /auth/me check still fails', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    sessionStorage.setItem('ccm_expired_sub', JSON.stringify({ plan_type: 'free' }));
    vi.mocked(axios.get).mockRejectedValue(new Error('still 403'));

    renderPage();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(hardNavigate).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('ccm_expired_sub')).not.toBeNull();
  });

  it('signs out and returns to /login when a signed-in user chooses a different account', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    vi.mocked(axios.get).mockRejectedValue(new Error('still 403'));
    const user = userEvent.setup();

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Sign out and use another account' }));

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });
});
