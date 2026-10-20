import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth, DEMO_EMAIL, DEMO_PASSWORD, DEMO_CLOUD_EMAIL } from './AuthContext';
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '../../../data-access';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('../../../data-access/rest/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../data-access/rest/client')>();
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

function DemoLoginConsumer() {
  const { user, isAuthenticated, login } = useAuth();
  return (
    <div>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="email">{user?.email ?? 'none'}</span>
      <button onClick={() => void login(DEMO_EMAIL, DEMO_PASSWORD)}>demo-login</button>
    </div>
  );
}

function CloudDemoConsumer() {
  const { user, isAuthenticated, isDemoSession, modules, login } = useAuth();
  return (
    <div>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="org">{user?.orgName ?? 'none'}</span>
      <span data-testid="demo">{String(isDemoSession)}</span>
      <span data-testid="cloud">{String(modules.cloudCost)}</span>
      <span data-testid="sap">{String(modules.sapMonitoring)}</span>
      <button onClick={() => void login(DEMO_CLOUD_EMAIL, DEMO_PASSWORD)}>cloud-login</button>
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

  it('keeps loading=true (no /login flash) when /auth/me fails with a subscriptionExpired 403 on mount', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-org-token');
    getMock.mockRejectedValue({ response: { status: 403, data: { subscriptionExpired: true } } });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(getMock).toHaveBeenCalledWith('/auth/me'));
    // Let the rejected /auth/me settle fully before asserting.
    await new Promise((resolve) => setTimeout(resolve, 0));
    // AppShell renders its spinner while loading — so it must NOT flip to
    // loading=false/authed=false, which would render <Navigate to="/login">
    // ahead of the api client's /subscription-expired hard redirect.
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('authed')).toHaveTextContent('false');
    // The token is kept: the expired page re-checks /auth/me with it.
    expect(localStorage.getItem(TOKEN_KEY)).toBe('expired-org-token');
  });

  it('clears a stale token when /auth/me fails for any other reason on mount', async () => {
    localStorage.setItem(TOKEN_KEY, 'invalid-token');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'invalid-refresh');
    getMock.mockRejectedValue({ response: { status: 401, data: { error: 'Token is not valid' } } });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('authed')).toHaveTextContent('false');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
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

  it('login mock-validates the demo credential locally instead of calling the API', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <DemoLoginConsumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('false'));

    await user.click(screen.getByText('demo-login'));

    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));
    expect(screen.getByTestId('email')).toHaveTextContent(DEMO_EMAIL);
    expect(postMock).not.toHaveBeenCalled();
    expect(getMock).not.toHaveBeenCalled();
  });

  it('signs the Cloud Cost only demo organisation in locally, without SAP Monitoring', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <CloudDemoConsumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('false'));

    await user.click(screen.getByText('cloud-login'));

    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));
    expect(screen.getByTestId('org')).toHaveTextContent('Cloud Cost only');
    expect(screen.getByTestId('demo')).toHaveTextContent('true');
    expect(screen.getByTestId('cloud')).toHaveTextContent('true');
    expect(screen.getByTestId('sap')).toHaveTextContent('false');
    expect(postMock).not.toHaveBeenCalled();
  });

  it('logout calls POST /auth/logout, then clears tokens, caches, onboarding flags, sessionStorage and user', async () => {
    localStorage.setItem(TOKEN_KEY, 'existing-token');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'existing-refresh');
    localStorage.setItem('ccm_azure_summary', '{}');
    localStorage.setItem('onboarded_cloud_org-1', 'true');
    localStorage.setItem('mavera.theme', 'dark');
    sessionStorage.setItem('ccm_expired_sub', '{}');
    getMock.mockResolvedValue({ data: { id: '1', email: 'a@b.com', role: 'member' } });
    postMock.mockResolvedValue({ data: {} });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));

    await user.click(screen.getByText('logout'));

    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('false'));
    expect(postMock).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'existing-refresh' });
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem('ccm_azure_summary')).toBeNull();
    expect(localStorage.getItem('onboarded_cloud_org-1')).toBeNull();
    expect(localStorage.getItem('mavera.theme')).toBe('dark');
    expect(sessionStorage.getItem('ccm_expired_sub')).toBeNull();
  });

  it('logout still clears local state when POST /auth/logout fails', async () => {
    localStorage.setItem(TOKEN_KEY, 'existing-token');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'existing-refresh');
    getMock.mockResolvedValue({ data: { id: '1', email: 'a@b.com', role: 'member' } });
    postMock.mockRejectedValue(new Error('network'));
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('true'));
    await user.click(screen.getByText('logout'));

    await waitFor(() => expect(screen.getByTestId('authed')).toHaveTextContent('false'));
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('unlockAccount posts {email, token}, and sendOtp returns whether the org already exists', async () => {
    postMock.mockImplementation((url: string) =>
      Promise.resolve({ data: url === '/auth/send-otp' ? { orgExists: true, orgName: 'Acme' } : {} }),
    );
    let ctx: ReturnType<typeof useAuth> | null = null;
    function Capture() {
      ctx = useAuth();
      return null;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    );
    await waitFor(() => expect(ctx).not.toBeNull());

    await ctx!.unlockAccount('jamie@acme.com', 'UNLOCK1');
    expect(postMock).toHaveBeenCalledWith('/auth/unlock-account', { email: 'jamie@acme.com', token: 'UNLOCK1' });

    await expect(ctx!.sendOtp('jamie@acme.com')).resolves.toEqual({ orgExists: true, orgName: 'Acme' });
    expect(postMock).toHaveBeenCalledWith('/auth/send-otp', { email: 'jamie@acme.com' });
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
