import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { MOCK_GCP_ACCOUNTS } from '../../../demo/gcp/mockGcpData';
import type { GcpAccount } from './gcpTypes';

interface GcpAccountContextValue {
  accounts: GcpAccount[];
  addAccount: (account: GcpAccount) => void;
  removeAccount: (id: string) => void;
  getAccount: (id: string) => GcpAccount | undefined;
}

const GcpAccountContext = createContext<GcpAccountContextValue | undefined>(undefined);

/** Mirrors the reference CCM app's gcp/context/GcpAccountContext.jsx: GCP
 * uses real nested routes (/gcp, /gcp/accounts, /gcp/account/:id), same as
 * AWS, so the account list lives above the router outlet — see
 * AwsAccountContext.tsx's doc comment for why that matters. No real
 * backend exists for this prototype, so this holds local state seeded from
 * mock data instead of calling `GET /gcp/accounts`. */
export function GcpAccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<GcpAccount[]>(MOCK_GCP_ACCOUNTS);

  const addAccount = useCallback((account: GcpAccount) => {
    setAccounts((current) => [...current, account]);
  }, []);

  const removeAccount = useCallback((id: string) => {
    setAccounts((current) => current.filter((a) => a.id !== id));
  }, []);

  const getAccount = useCallback((id: string) => accounts.find((a) => a.id === id), [accounts]);

  const value = useMemo<GcpAccountContextValue>(
    () => ({ accounts, addAccount, removeAccount, getAccount }),
    [accounts, addAccount, removeAccount, getAccount],
  );

  return <GcpAccountContext.Provider value={value}>{children}</GcpAccountContext.Provider>;
}

export function useGcpAccounts(): GcpAccountContextValue {
  const ctx = useContext(GcpAccountContext);
  if (!ctx) throw new Error('useGcpAccounts must be used within a GcpAccountProvider');
  return ctx;
}
