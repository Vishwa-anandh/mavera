import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '../api';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>();
  return {
    ...actual,
    api: { get: (...args: unknown[]) => getMock(...args), post: (...args: unknown[]) => postMock(...args) },
  };
});

function Consumer() {
  const { user, loading, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <button onClick={() => login('a@b.com', 'secret')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function RefreshConsumer() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  // `refresh-done` only flips after refreshUser()'s promise (i.e. fetchMe's
  // full try/catch/finally cycle) has settled, regardless of which branch it
  // took. Using it as the wait condition — rather than asserting on
  // authed/email directly right after the click — avoids a false pass: since
  // the "preserved" assertion's expected value is identical to its
  // pre-click value, a plain post-click check could pass on a stale render
  // before the async catch/finally has actually run.
  const [done, setDone] = useState(false);
  return (
    <div>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <span data-testid="refresh-done">{String(done)}</span>
      <button
        onClick={() => {
          void refreshUser().finally(() => setDone(true));
        }}
      >
        refresh
      </button>
    </div>
  );
}

function FeaturesConsumer() {
  const { features, accountLimits, cloudAccess } = useAuth();
  return (
    <div>
      <span data-testid="budgets">{String(features.budgets)}</span>
      <span data-testid="azure-limit">{accountLimits.azure}</span>
      <span data-testid="cloud-access-length">{cloudAccess.length}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    getMock.mockReset();
    postMock.mockReset();
  });

  it('starts with loading=true and skips /auth/me when there is no stored token', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(getMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('authed')).toHaveTextContent('false');
  });

  it('calls /auth/me on mount when a token is already stored, and becomes authenticated', async () => {
    localStorage.setItem(TOKEN_KEY, 'existing-token');
    getMock.mockResolvedValue({ data: { id: '1', email: 'a@b.com', role: 'member' } });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));
    expect(getMock).toHaveBeenCalledWith('/auth/me');
    expect(screen.getByTestId('email')).toHaveTextContent('a@b.com');
  });

  it('does not flip isAuthenticated true when /auth/me fails with a subscriptionExpired 403', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-org-token');
    getMock.mockRejectedValue({ response: { status: 403, data: { subscriptionExpired: true } } });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authed')).toHaveTextContent('false');
    // The redirect to /subscription-expired itself is the api client's job
    // (Task 7); this test only pins that AuthContext does not race it by
    // rendering a /login redirect first.
  });

  it('preserves an already-authenticated user when a later /auth/me call reveals a lapsed subscription', async () => {
    localStorage.setItem(TOKEN_KEY, 'existing-token');
    getMock.mockResolvedValueOnce({ data: { id: '1', email: 'a@b.com', role: 'member' } });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <RefreshConsumer />
      </AuthProvider>,
    );

    // Establish a real, non-null user first.
    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));
    expect(screen.getByTestId('email')).toHaveTextContent('a@b.com');

    // A later /auth/me call (e.g. from a background refresh) reveals the
    // org's subscription has lapsed.
    getMock.mockRejectedValueOnce({ response: { status: 403, data: { subscriptionExpired: true } } });

    await user.click(screen.getByText('refresh'));
    await waitFor(() => expect(screen.getByTestId('refresh-done')).toHaveTextContent('true'));

    // The existing, already-authenticated user must be preserved — not
    // nulled out — so nothing renders a premature /login redirect ahead of
    // the api client's own /subscription-expired redirect.
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('authed')).toHaveTextContent('true');
    expect(screen.getByTestId('email')).toHaveTextContent('a@b.com');
  });

  it('login re-fetches /auth/me rather than trusting the login response alone', async () => {
    postMock.mockResolvedValue({ data: { token: 'new-token', refreshToken: 'new-refresh' } });
    getMock.mockResolvedValue({ data: { id: '2', email: 'fresh@b.com', role: 'admin' } });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    await user.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('email')).toHaveTextContent('fresh@b.com'));
    expect(postMock).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'secret' });
    expect(getMock).toHaveBeenCalledWith('/auth/me');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('new-refresh');
  });

  it('logout clears tokens, cloud summary caches, and user state', async () => {
    localStorage.setItem(TOKEN_KEY, 'existing-token');
    localStorage.setItem('ccm_azure_summary', '{}');
    getMock.mockResolvedValue({ data: { id: '1', email: 'a@b.com', role: 'member' } });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));

    await user.click(screen.getByText('logout'));

    expect(screen.getByTestId('authed')).toHaveTextContent('false');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem('ccm_azure_summary')).toBeNull();
  });

  it('derives default features/accountLimits/cloudAccess when the user omits them', async () => {
    localStorage.setItem(TOKEN_KEY, 'existing-token');
    getMock.mockResolvedValue({ data: { id: '1', email: 'a@b.com', role: 'member' } });

    render(
      <AuthProvider>
        <FeaturesConsumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('budgets')).toHaveTextContent('true'));
    expect(screen.getByTestId('azure-limit')).toHaveTextContent('3');
    expect(screen.getByTestId('cloud-access-length')).toHaveTextContent('0');
  });
});
