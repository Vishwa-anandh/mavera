import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { fireToast } from '../lib/toastEvents';

export const TOKEN_KEY = 'token';
export const REFRESH_TOKEN_KEY = 'refreshToken';

const CLOUD_SUMMARY_CACHE_KEYS = ['ccm_azure_summary', 'ccm_aws_summary', 'ccm_btp_summary', 'ccm_gcp_summary'];

export function clearCloudSummaryCaches(): void {
  CLOUD_SUMMARY_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _retry?: boolean;
}

interface ErrorPayload {
  error?: string;
  isLocked?: boolean;
  message?: string;
  subscriptionExpired?: boolean;
  subscription?: unknown;
}

const RETRY_DELAYS_MS = [1000, 2000, 4000];
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

export interface CreateApiClientOptions {
  navigate?: (path: string) => void;
  waitMs?: (ms: number) => Promise<void>;
}

export function createApiClient(baseURL: string | undefined, options: CreateApiClientOptions = {}): AxiosInstance {
  const navigate = options.navigate ?? ((path: string) => {
    window.location.href = path;
  });
  const wait = options.waitMs ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let isRefreshing = false;
  // Each queued subscriber is settled exactly once: with the new token when
  // the refresh succeeds, or with the refresh error when it fails (matching
  // the reference app's onRefreshed(err, token) — otherwise queued requests
  // would hang forever on a failed refresh).
  let refreshSubscribers: Array<(error: unknown, token: string | null) => void> = [];
  let isRedirectingToExpired = false;

  function subscribeTokenRefresh(callback: (error: unknown, token: string | null) => void) {
    refreshSubscribers.push(callback);
  }

  function onRefreshed(error: unknown, token: string | null) {
    refreshSubscribers.forEach((callback) => callback(error, token));
    refreshSubscribers = [];
  }

  function hardLogout(redirectPath: string) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    clearCloudSummaryCaches();
    navigate(redirectPath);
  }

  const instance = axios.create({ baseURL });

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers = config.headers ?? ({} as InternalAxiosRequestConfig['headers']);
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ErrorPayload>) => {
      const config = error.config as RetryableConfig | undefined;
      if (!config) return Promise.reject(error);

      const isAuthRoute = (config.url ?? '').startsWith('/auth/');

      if (!error.response && !isAuthRoute) {
        config._retryCount = config._retryCount ?? 0;
        if (config._retryCount < RETRY_DELAYS_MS.length) {
          const delay = RETRY_DELAYS_MS[config._retryCount];
          config._retryCount += 1;
          await wait(delay);
          return instance(config);
        }
        // Retries exhausted — surface it rather than failing silently
        // (reference api/index.js resolveToast: no-response branch).
        fireToast({ type: 'error', message: 'Cannot reach the server. Check your connection and try again.' });
        return Promise.reject(error);
      }

      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 401 && data?.error === 'TokenExpired' && !config._retry) {
        config._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
            if (!refreshToken) throw new Error('No refresh token');
            const { data: refreshData } = await axios.post<{ token: string; refreshToken?: string }>(
              `${baseURL}/auth/refresh-token`,
              { refreshToken },
            );
            localStorage.setItem(TOKEN_KEY, refreshData.token);
            // The backend rotates the refresh token on every refresh
            // (reference api/index.js persists res.data.refreshToken too).
            if (refreshData.refreshToken) {
              localStorage.setItem(REFRESH_TOKEN_KEY, refreshData.refreshToken);
            }
            isRefreshing = false;
            onRefreshed(null, refreshData.token);
            config.headers = config.headers ?? ({} as InternalAxiosRequestConfig['headers']);
            config.headers.Authorization = `Bearer ${refreshData.token}`;
            return instance(config);
          } catch (refreshError) {
            isRefreshing = false;
            onRefreshed(refreshError, null);
            // Subscription expired — the 403 handler owns that redirect;
            // don't override it with /login (reference behaviour).
            const refreshData = (refreshError as AxiosError<ErrorPayload>).response?.data;
            if (!refreshData?.subscriptionExpired) {
              hardLogout('/login?error=session_expired');
            }
            return Promise.reject(refreshError);
          }
        }

        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((refreshError, token) => {
            if (refreshError || !token) {
              reject(refreshError ?? error);
              return;
            }
            config.headers = config.headers ?? ({} as InternalAxiosRequestConfig['headers']);
            config.headers.Authorization = `Bearer ${token}`;
            resolve(instance(config));
          });
        });
      }

      if (status === 403 && data?.subscriptionExpired) {
        // Guard on the current path as well as the in-flight flag: a user
        // already on /subscription-expired whose page (or AuthProvider) hits
        // another 403 must not be redirected again — that remounts the app,
        // re-runs /auth/me, 403s again, and loops forever.
        const alreadyOnExpiredPage = window.location.pathname === '/subscription-expired';
        if (!isRedirectingToExpired && !alreadyOnExpiredPage) {
          isRedirectingToExpired = true;
          clearCloudSummaryCaches();
          if (data.subscription) {
            sessionStorage.setItem('ccm_expired_sub', JSON.stringify(data.subscription));
          }
          navigate('/subscription-expired');
        }
        return Promise.reject(error);
      }

      // The backend reports error text in `error` (reference api/index.js
      // reads error.response.data?.error for this branch).
      // A login lock-out (isLocked) is not an org deactivation: LoginPage
      // handles it inline with the unlock sub-flow, so don't hard-redirect.
      if (status === 403 && !data?.isLocked && /deactivated|locked/i.test(data?.error ?? '')) {
        hardLogout('/login?error=account_deactivated');
        return Promise.reject(error);
      }

      if (status && RETRYABLE_STATUS_CODES.includes(status)) {
        fireToast({ type: 'error', message: data?.error ?? 'Something went wrong. Please try again.' });
      }

      return Promise.reject(error);
    },
  );

  return instance;
}

export const api = createApiClient(import.meta.env.VITE_API_URL);
