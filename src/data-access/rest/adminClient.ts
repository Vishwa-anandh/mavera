import axios from 'axios';
import { apiBaseUrl } from '../../app/config/environment';

export const SA_TOKEN_KEY = 'sa_token';
export const SA_USERNAME_KEY = 'sa_username';

/**
 * A deliberately separate axios instance from data-access/rest/client.ts — the super
 * admin portal is its own authentication surface (its own token, its own
 * `/admin`-prefixed API base), matching the reference CCM app's real
 * super-admin API (its adminApi.js hits `{VITE_API_URL}/admin/*` using a
 * `sa_token` bearer, entirely independent of the org-level session).
 */
export const adminApi = axios.create({
  baseURL: `${apiBaseUrl ?? ''}/admin`,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(SA_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(SA_TOKEN_KEY);
      localStorage.removeItem(SA_USERNAME_KEY);
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);
