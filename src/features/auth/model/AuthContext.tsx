import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearCloudSummaryCaches, TOKEN_KEY, REFRESH_TOKEN_KEY } from '../../../data-access';
import type { User, CloudProvider } from '../../../shared/types/auth';
import { isDevelopment } from '../../../app/config/environment';

/**
 * POST /auth/register body — field-for-field what the reference app's
 * AuthContext.register sends (reference context/AuthContext.jsx).
 */
export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  orgName: string;
  /** 'admin' when creating a new org, 'member' when joining an existing one. */
  role: 'admin' | 'member';
  otp: string;
  /** Required by the backend when creating a new org; empty when joining. */
  inviteToken: string;
  /** Comma-joined provider ids, e.g. "azure,aws" — a string, not an array. */
  cloudPreference: string;
  invoiceOnly: boolean;
}

/** POST /auth/send-otp response (reference pages/RegisterPage.jsx handleSendOtp). */
export interface SendOtpResult {
  orgExists: boolean;
  orgName?: string;
}

interface Features {
  budgets: boolean;
  smartAlerts: boolean;
  syncLogs: boolean;
  recommendations: boolean;
  cloudManagement: boolean;
  invoices: boolean;
}

interface AccountLimits {
  azure: number;
  aws: number;
  btp: number;
  gcp?: number;
}

/** Org-level module subscription — chosen by the super admin, not the org
 * itself. See User.modules in src/shared/types/auth.ts. */
interface Modules {
  cloudCost: boolean;
  idocMonitoring: boolean;
  sapMonitoring: boolean;
}

const DEFAULT_FEATURES: Features = {
  budgets: true,
  smartAlerts: true,
  syncLogs: true,
  recommendations: true,
  cloudManagement: true,
  invoices: true,
};

const DEFAULT_ACCOUNT_LIMITS: AccountLimits = { azure: 3, aws: 3, btp: 3 };
const DEFAULT_MODULES: Modules = { cloudCost: true, idocMonitoring: true, sapMonitoring: true };

/**
 * PROTOTYPE ONLY: there is no org-level backend for this prototype to call
 * (api/index.ts's baseURL points nowhere real), so login mock-validates this
 * one fixed demo credential locally instead of round-tripping
 * `POST /auth/login` — same approach as SuperAdminAuthContext's own demo
 * credential. Swap the special-case in login() below for a plain API call
 * once a backend exists.
 */
export const DEMO_EMAIL = 'demo@mavera.local';
export const DEMO_PASSWORD = 'Mavera@2026';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  invoiceOnly: boolean;
  cloudAccess: CloudProvider[];
  features: Features;
  accountLimits: AccountLimits;
  modules: Modules;
  maxUsers: number | undefined;
  planType: 'free' | 'basic' | 'premium' | 'enterprise';
  subscriptionStartsAt: string | undefined;
  subscriptionExpiresAt: string | null | undefined;
  subscriptionActive: boolean;
  subscriptionNotes: string | undefined;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  unlockAccount: (email: string, token: string) => Promise<void>;
  sendOtp: (email: string) => Promise<SendOtpResult>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  /** `POST /auth/change-password` (the reference app's contract). Rejects with the backend's
   * error text when the current password is wrong or the new one is refused. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /**
   * PROTOTYPE ONLY. Bypasses real login for local UI exploration when there's
   * no backend to authenticate against. Only defined in dev builds
   * (`isDevelopment` is compiled away entirely in production, so this
   * is always `undefined` — and therefore invisible — in a real build).
   * Remove once a real backend is wired up, or before this ships anywhere.
   */
  devLogin?: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface ApiErrorLike {
  response?: { status?: number; data?: { subscriptionExpired?: boolean } };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get<User>('/auth/me');
      setUser(data);
      setLoading(false);
    } catch (error) {
      const { status, data } = (error as ApiErrorLike).response ?? {};
      if (status === 403 && data?.subscriptionExpired) {
        // api/index.ts's own interceptor is already hard-redirecting to
        // /subscription-expired. Leave `user` untouched and, crucially, leave
        // `loading` as it is: on the initial mount that keeps AppShell on its
        // spinner rather than flashing a <Navigate to="/login"> for a tick
        // before the full-page redirect lands. (A later refreshUser() on an
        // already-loaded session keeps its user and loading=false.)
        return;
      }
      // Any other failure means the stored token is unusable — drop it too,
      // matching the reference AuthContext's loadUser catch branch.
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem(TOKEN_KEY)) {
      void fetchMe();
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  // PROTOTYPE ONLY — see the doc comment on DEMO_EMAIL/DEMO_PASSWORD above.
  const applyDemoSession = useCallback(() => {
    setUser({
      id: 'dev-preview-user',
      email: DEMO_EMAIL,
      name: 'Dev Preview',
      orgName: 'Maitsys Demo Org',
      role: 'admin',
      canViewAzure: true,
      canViewAws: true,
      canViewBtp: true,
      canViewGcp: true,
      cloudAccess: ['azure', 'aws', 'btp', 'gcp'],
      invoiceOnly: false,
    });
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        applyDemoSession();
        return;
      }
      const { data } = await api.post<{ token: string; refreshToken: string }>('/auth/login', {
        email,
        password,
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      // Re-fetch rather than trust the login response's own permission
      // payload, which can lag the database.
      await fetchMe();
    },
    [fetchMe, applyDemoSession],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    await api.post('/auth/register', payload);
  }, []);

  const logout = useCallback(async () => {
    // Invalidate the session server-side first (reference awaits this and
    // ignores failures), then clear every piece of local session state.
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // best effort — local state is cleared regardless
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    clearCloudSummaryCaches();
    Object.keys(localStorage)
      .filter((key) => key.startsWith('onboarded_cloud_'))
      .forEach((key) => localStorage.removeItem(key));
    sessionStorage.clear();
    setUser(null);
  }, []);

  // Background re-fetch for an already-loaded session: on failure keep the
  // current user (reference refreshUser only logs the error). A lapsed
  // subscription is still handled by the api client's own 403 redirect.
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get<User>('/auth/me');
      setUser(data);
    } catch {
      // keep the existing session state
    }
  }, []);

  const unlockAccount = useCallback(async (email: string, token: string) => {
    await api.post('/auth/unlock-account', { email, token });
  }, []);

  const sendOtp = useCallback(async (email: string): Promise<SendOtpResult> => {
    const { data } = await api.post<SendOtpResult>('/auth/send-otp', { email });
    return { orgExists: Boolean(data?.orgExists), orgName: data?.orgName };
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    await api.post('/auth/verify-otp', { email, otp });
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    // PROTOTYPE ONLY: the demo session has no backend account, so it only checks the current
    // password and stores nothing.
    if (user?.id === 'dev-preview-user') {
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (currentPassword !== DEMO_PASSWORD) throw { response: { data: { error: 'Your current password is incorrect.' } } };
      return;
    }
    await api.post('/auth/change-password', { currentPassword, newPassword });
  }, [user?.id]);

  // PROTOTYPE ONLY — see the doc comment on AuthContextValue.devLogin.
  const devLogin = useCallback(() => {
    applyDemoSession();
  }, [applyDemoSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      invoiceOnly: user?.invoiceOnly ?? false,
      cloudAccess: user?.cloudAccess ?? [],
      features: { ...DEFAULT_FEATURES, ...user?.features },
      accountLimits: { ...DEFAULT_ACCOUNT_LIMITS, ...user?.accountLimits },
      modules: { ...DEFAULT_MODULES, ...user?.modules },
      maxUsers: user?.maxUsers,
      planType: user?.planType ?? 'enterprise',
      subscriptionStartsAt: user?.subscriptionStartsAt,
      subscriptionExpiresAt: user?.subscriptionExpiresAt,
      subscriptionActive: user?.subscriptionActive ?? true,
      subscriptionNotes: user?.subscriptionNotes,
      login,
      register,
      logout,
      refreshUser,
      unlockAccount,
      sendOtp,
      verifyOtp,
      changePassword,
      devLogin: isDevelopment ? devLogin : undefined,
    }),
    [user, loading, login, register, logout, refreshUser, unlockAccount, sendOtp, verifyOtp, changePassword, devLogin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
