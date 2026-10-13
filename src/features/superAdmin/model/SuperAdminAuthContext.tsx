import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { SA_TOKEN_KEY, SA_USERNAME_KEY } from '../../../data-access';

export interface SuperAdminAuthContextValue {
  username: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextValue | undefined>(undefined);

/**
 * PROTOTYPE ONLY: there is no super-admin backend for this prototype to call
 * (adminApi.ts's baseURL points nowhere real), so login mock-validates a
 * single fixed demo credential instead of round-tripping
 * `POST /admin/auth/login`. Swap this body for a real `adminApi.post(...)`
 * call once a backend exists — the error shape thrown below already matches
 * axios's `error.response.data.error`, so LoginPage's catch block doesn't
 * need to change when that happens.
 */
export const DEMO_USERNAME = 'superadmin';
export const DEMO_PASSWORD = 'Maitsys@2026';

export function SuperAdminAuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem(SA_USERNAME_KEY));

  const login = useCallback(async (enteredUsername: string, password: string) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (enteredUsername !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
      throw { response: { data: { error: 'Invalid username or password.' } } };
    }
    localStorage.setItem(SA_TOKEN_KEY, 'demo-super-admin-token');
    localStorage.setItem(SA_USERNAME_KEY, enteredUsername);
    setUsername(enteredUsername);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SA_TOKEN_KEY);
    localStorage.removeItem(SA_USERNAME_KEY);
    setUsername(null);
  }, []);

  const value = useMemo<SuperAdminAuthContextValue>(
    () => ({ username, isAuthenticated: Boolean(username && localStorage.getItem(SA_TOKEN_KEY)), login, logout }),
    [username, login, logout],
  );

  return <SuperAdminAuthContext.Provider value={value}>{children}</SuperAdminAuthContext.Provider>;
}

export function useSuperAdminAuth(): SuperAdminAuthContextValue {
  const ctx = useContext(SuperAdminAuthContext);
  if (!ctx) throw new Error('useSuperAdminAuth must be used within a SuperAdminAuthProvider');
  return ctx;
}
