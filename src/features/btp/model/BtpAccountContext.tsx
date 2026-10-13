import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { MOCK_BTP_ACCOUNTS } from '../../../demo/btp/mockBtpData';
import type { BtpAccount } from './btpTypes';

interface BtpAccountContextValue {
  accounts: BtpAccount[];
  addAccount: (account: BtpAccount) => void;
  removeAccount: (id: string) => void;
  renameAccount: (id: string, name: string) => void;
  getAccount: (id: string) => BtpAccount | undefined;
}

const BtpAccountContext = createContext<BtpAccountContextValue | undefined>(undefined);

/** Mirrors the reference CCM app's btp/context/BtpAccountContext.jsx — same
 * nested-route pattern as AWS/GCP (see AwsAccountContext.tsx's doc comment
 * for why the account list needs to live above the router outlet). */
export function BtpAccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<BtpAccount[]>(MOCK_BTP_ACCOUNTS);

  const addAccount = useCallback((account: BtpAccount) => {
    setAccounts((current) => [...current, account]);
  }, []);

  const removeAccount = useCallback((id: string) => {
    setAccounts((current) => current.filter((a) => a.id !== id));
  }, []);

  const renameAccount = useCallback((id: string, name: string) => {
    setAccounts((current) => current.map((a) => (a.id === id ? { ...a, name } : a)));
  }, []);

  const getAccount = useCallback((id: string) => accounts.find((a) => a.id === id), [accounts]);

  const value = useMemo<BtpAccountContextValue>(
    () => ({ accounts, addAccount, removeAccount, renameAccount, getAccount }),
    [accounts, addAccount, removeAccount, renameAccount, getAccount],
  );

  return <BtpAccountContext.Provider value={value}>{children}</BtpAccountContext.Provider>;
}

export function useBtpAccounts(): BtpAccountContextValue {
  const ctx = useContext(BtpAccountContext);
  if (!ctx) throw new Error('useBtpAccounts must be used within a BtpAccountProvider');
  return ctx;
}
