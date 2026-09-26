import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearCloudSummaryCaches, TOKEN_KEY, REFRESH_TOKEN_KEY } from '../api';
import type { User, CloudProvider } from '../types/auth';

export interface RegisterPayload {
  organizationName: string;
  email: string;
  password: string;
  fullName: string;
  cloudAccess: CloudProvider[];
  invoiceOnly: boolean;
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

const DEFAULT_FEATURES: Features = {
  budgets: true,
  smartAlerts: true,
  syncLogs: true,
  recommendations: true,
  cloudManagement: true,
  invoices: true,
};

const DEFAULT_ACCOUNT_LIMITS: AccountLimits = { azure: 3, aws: 3, btp: 3 };

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  invoiceOnly: boolean;
  cloudAccess: CloudProvider[];
  features: Features;
  accountLimits: AccountLimits;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  unlockAccount: (unlockToken: string) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
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
    } catch (error) {
      const { status, data } = (error as ApiErrorLike).response ?? {};
      if (status === 403 && data?.subscriptionExpired) {
        // api/index.ts's own interceptor already redirects to
        // /subscription-expired — do not flip isAuthenticated false here,
        // which would otherwise flash a redirect to /login first.
        return;
      }
      setUser(null);
    } finally {
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

  const login = useCallback(
    async (email: string, password: string) => {
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
    [fetchMe],
  );

  const register = useCallback(async (payload: RegisterPayload) => {
    await api.post('/auth/register', payload);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    clearCloudSummaryCaches();
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => fetchMe(), [fetchMe]);

  const unlockAccount = useCallback(async (unlockToken: string) => {
    await api.post('/auth/unlock-account', { unlockToken });
  }, []);

  const sendOtp = useCallback(async (email: string) => {
    await api.post('/auth/send-otp', { email });
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    await api.post('/auth/verify-otp', { email, otp });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      invoiceOnly: user?.invoiceOnly ?? false,
      cloudAccess: user?.cloudAccess ?? [],
      features: { ...DEFAULT_FEATURES, ...user?.features },
      accountLimits: { ...DEFAULT_ACCOUNT_LIMITS, ...user?.accountLimits },
      login,
      register,
      logout,
      refreshUser,
      unlockAccount,
      sendOtp,
      verifyOtp,
    }),
    [user, loading, login, register, logout, refreshUser, unlockAccount, sendOtp, verifyOtp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
