import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { MOCK_AWS_ACCOUNTS } from '../../../demo/aws/mockAwsData';
import type { AwsAccount } from './awsTypes';

interface AwsAccountContextValue {
  accounts: AwsAccount[];
  addAccount: (account: AwsAccount) => void;
  removeAccount: (id: string) => void;
  renameAccount: (id: string, name: string) => void;
  getAccount: (id: string) => AwsAccount | undefined;
}

const AwsAccountContext = createContext<AwsAccountContextValue | undefined>(undefined);

/**
 * Mirrors the reference CCM app's aws/context/AccountContext.jsx: AWS uses
 * real nested routes (/aws, /aws/accounts, /aws/account/:id), not a
 * view-state switcher, so the account list has to live above the router
 * outlet or a rename/add/delete in AccountManager would be lost the moment
 * the route unmounts it. No real backend exists for this prototype, so
 * this holds local state seeded from mock data instead of calling
 * `GET /aws/accounts`.
 */
export function AwsAccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<AwsAccount[]>(MOCK_AWS_ACCOUNTS);

  const addAccount = useCallback((account: AwsAccount) => {
    setAccounts((current) => [...current, account]);
  }, []);

  const removeAccount = useCallback((id: string) => {
    setAccounts((current) => current.filter((a) => a.id !== id));
  }, []);

  const renameAccount = useCallback((id: string, name: string) => {
    setAccounts((current) => current.map((a) => (a.id === id ? { ...a, name } : a)));
  }, []);

  const getAccount = useCallback((id: string) => accounts.find((a) => a.id === id), [accounts]);

  const value = useMemo<AwsAccountContextValue>(
    () => ({ accounts, addAccount, removeAccount, renameAccount, getAccount }),
    [accounts, addAccount, removeAccount, renameAccount, getAccount],
  );

  return <AwsAccountContext.Provider value={value}>{children}</AwsAccountContext.Provider>;
}

export function useAwsAccounts(): AwsAccountContextValue {
  const ctx = useContext(AwsAccountContext);
  if (!ctx) throw new Error('useAwsAccounts must be used within an AwsAccountProvider');
  return ctx;
}
