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
  let refreshSubscribers: Array<(token: string) => void> = [];
  let isRedirectingToExpired = false;

  function subscribeTokenRefresh(callback: (token: string) => void) {
    refreshSubscribers.push(callback);
  }

  function onRefreshed(token: string) {
    refreshSubscribers.forEach((callback) => callback(token));
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
            const { data: refreshData } = await axios.post<{ token: string }>(
              `${baseURL}/auth/refresh-token`,
              { refreshToken },
            );
            localStorage.setItem(TOKEN_KEY, refreshData.token);
            isRefreshing = false;
            onRefreshed(refreshData.token);
            config.headers = config.headers ?? ({} as InternalAxiosRequestConfig['headers']);
            config.headers.Authorization = `Bearer ${refreshData.token}`;
            return instance(config);
          } catch (refreshError) {
            isRefreshing = false;
            refreshSubscribers = [];
            hardLogout('/login?error=session_expired');
            return Promise.reject(refreshError);
          }
        }

        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            config.headers = config.headers ?? ({} as InternalAxiosRequestConfig['headers']);
            config.headers.Authorization = `Bearer ${token}`;
            resolve(instance(config));
          });
        });
      }

      if (status === 403 && data?.subscriptionExpired) {
        clearCloudSummaryCaches();
        sessionStorage.setItem('ccm_expired_sub', JSON.stringify(data.subscription ?? {}));
        if (!isRedirectingToExpired) {
          isRedirectingToExpired = true;
          navigate('/subscription-expired');
        }
        return Promise.reject(error);
      }

      if (status === 403 && /deactivated|locked/i.test(data?.message ?? '')) {
        hardLogout('/login?error=account_deactivated');
        return Promise.reject(error);
      }

      if (status && RETRYABLE_STATUS_CODES.includes(status)) {
        fireToast({ type: 'error', message: data?.message ?? 'Something went wrong. Please try again.' });
      }

      return Promise.reject(error);
    },
  );

  return instance;
}

export const api = createApiClient(import.meta.env.VITE_API_URL);
