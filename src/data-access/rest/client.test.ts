import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { createApiClient, clearCloudSummaryCaches, TOKEN_KEY, REFRESH_TOKEN_KEY } from './client';

const BASE_URL = 'http://test.local/api';

function setup() {
  const navigate = vi.fn();
  const waitMs = vi.fn().mockResolvedValue(undefined);
  const client = createApiClient(BASE_URL, { navigate, waitMs });
  const mock = new MockAdapter(client);
  const rawMock = new MockAdapter(axios);
  return { client, mock, rawMock, navigate, waitMs };
}

describe('api client interceptors', () => {
  let mocks: ReturnType<typeof setup>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mocks = setup();
  });

  afterEach(() => {
    mocks.mock.restore();
    mocks.rawMock.restore();
  });

  it('attaches the bearer token from localStorage to outgoing requests', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc123');
    mocks.mock.onGet('/ping').reply((config) => [200, { auth: config.headers?.Authorization }]);

    const response = await mocks.client.get('/ping');
    expect(response.data.auth).toBe('Bearer abc123');
  });

  it('coalesces concurrent 401 TokenExpired responses into a single refresh call', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-token');

    let refreshCalls = 0;
    mocks.rawMock.onPost(`${BASE_URL}/auth/refresh-token`).reply(() => {
      refreshCalls += 1;
      return [200, { token: 'new-token', refreshToken: 'rotated-refresh-token' }];
    });
    mocks.mock.onGet('/one').reply((config) =>
      config.headers?.Authorization === 'Bearer new-token' ? [200, { ok: true }] : [401, { error: 'TokenExpired' }],
    );
    mocks.mock.onGet('/two').reply((config) =>
      config.headers?.Authorization === 'Bearer new-token' ? [200, { ok: true }] : [401, { error: 'TokenExpired' }],
    );

    const [r1, r2] = await Promise.all([mocks.client.get('/one'), mocks.client.get('/two')]);

    expect(r1.data).toEqual({ ok: true });
    expect(r2.data).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('rotated-refresh-token');
  });

  it('keeps the existing refresh token when the refresh response does not rotate it', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh-token');
    mocks.rawMock.onPost(`${BASE_URL}/auth/refresh-token`).reply(200, { token: 'new-token' });
    mocks.mock.onGet('/one').reply((config) =>
      config.headers?.Authorization === 'Bearer new-token' ? [200, { ok: true }] : [401, { error: 'TokenExpired' }],
    );

    await mocks.client.get('/one');
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh-token');
  });

  it('rejects requests queued behind a refresh when the refresh itself fails (instead of hanging)', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'bad-refresh-token');
    mocks.rawMock.onPost(`${BASE_URL}/auth/refresh-token`).reply(401);
    mocks.mock.onGet('/one').reply(401, { error: 'TokenExpired' });
    mocks.mock.onGet('/two').reply(401, { error: 'TokenExpired' });

    const results = await Promise.allSettled([mocks.client.get('/one'), mocks.client.get('/two')]);
    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
  });

  it('hard-logs-out and redirects to login when the refresh call itself fails', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'bad-refresh-token');
    mocks.rawMock.onPost(`${BASE_URL}/auth/refresh-token`).reply(401);
    mocks.mock.onGet('/one').reply(401, { error: 'TokenExpired' });

    await expect(mocks.client.get('/one')).rejects.toBeTruthy();
    expect(mocks.navigate).toHaveBeenCalledWith('/login?error=session_expired');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('retries a network error up to 3 times with backoff, then toasts once', async () => {
    const toastHandler = vi.fn();
    window.addEventListener('ccm:toast', toastHandler);
    mocks.mock.onGet('/flaky').networkError();

    await expect(mocks.client.get('/flaky')).rejects.toBeTruthy();
    expect(mocks.waitMs).toHaveBeenCalledTimes(3);
    expect(mocks.waitMs).toHaveBeenNthCalledWith(1, 1000);
    expect(mocks.waitMs).toHaveBeenNthCalledWith(2, 2000);
    expect(mocks.waitMs).toHaveBeenNthCalledWith(3, 4000);
    expect(toastHandler).toHaveBeenCalledTimes(1);
    expect((toastHandler.mock.calls[0][0] as CustomEvent).detail).toEqual({
      type: 'error',
      message: 'Cannot reach the server. Check your connection and try again.',
    });
    window.removeEventListener('ccm:toast', toastHandler);
  });

  it('does not retry a network error on /auth/* routes', async () => {
    mocks.mock.onPost('/auth/login').networkError();

    await expect(mocks.client.post('/auth/login')).rejects.toBeTruthy();
    expect(mocks.waitMs).not.toHaveBeenCalled();
  });

  it('redirects once to /subscription-expired even when two requests both 403 concurrently', async () => {
    mocks.mock.onGet('/one').reply(403, { subscriptionExpired: true, subscription: { plan: 'free' } });
    mocks.mock.onGet('/two').reply(403, { subscriptionExpired: true, subscription: { plan: 'free' } });

    await Promise.allSettled([mocks.client.get('/one'), mocks.client.get('/two')]);

    expect(mocks.navigate).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith('/subscription-expired');
    expect(JSON.parse(sessionStorage.getItem('ccm_expired_sub') ?? '{}')).toEqual({ plan: 'free' });
  });

  it('does not redirect again when already on /subscription-expired (prevents a reload loop)', async () => {
    window.history.pushState({}, '', '/subscription-expired');
    try {
      mocks.mock.onGet('/auth/me').reply(403, { subscriptionExpired: true });

      await expect(mocks.client.get('/auth/me')).rejects.toBeTruthy();
      await expect(mocks.client.get('/auth/me')).rejects.toBeTruthy();

      expect(mocks.navigate).not.toHaveBeenCalled();
    } finally {
      window.history.pushState({}, '', '/');
    }
  });

  it('does not treat a deactivation message in `message` (rather than `error`) as a deactivation', async () => {
    mocks.mock.onGet('/one').reply(403, { message: 'Account deactivated by administrator' });

    await expect(mocks.client.get('/one')).rejects.toBeTruthy();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('leaves a login lock-out (isLocked) to LoginPage instead of hard-redirecting', async () => {
    mocks.mock.onPost('/auth/login').reply(403, { isLocked: true, error: 'Account locked' });

    await expect(mocks.client.post('/auth/login')).rejects.toBeTruthy();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('hard-logs-out when the account is deactivated', async () => {
    mocks.mock.onGet('/one').reply(403, { error: 'Account deactivated by administrator' });

    await expect(mocks.client.get('/one')).rejects.toBeTruthy();
    expect(mocks.navigate).toHaveBeenCalledWith('/login?error=account_deactivated');
  });

  it('fires a toast for a 500 response without redirecting', async () => {
    const toastHandler = vi.fn();
    window.addEventListener('ccm:toast', toastHandler);
    mocks.mock.onGet('/one').reply(500, { error: 'Server error' });

    await expect(mocks.client.get('/one')).rejects.toBeTruthy();
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(toastHandler).toHaveBeenCalledTimes(1);
    window.removeEventListener('ccm:toast', toastHandler);
  });

  it('clearCloudSummaryCaches removes all four provider cache keys', () => {
    localStorage.setItem('ccm_azure_summary', '{}');
    localStorage.setItem('ccm_aws_summary', '{}');
    localStorage.setItem('ccm_btp_summary', '{}');
    localStorage.setItem('ccm_gcp_summary', '{}');
    clearCloudSummaryCaches();
    expect(localStorage.getItem('ccm_azure_summary')).toBeNull();
    expect(localStorage.getItem('ccm_aws_summary')).toBeNull();
    expect(localStorage.getItem('ccm_btp_summary')).toBeNull();
    expect(localStorage.getItem('ccm_gcp_summary')).toBeNull();
  });
});
