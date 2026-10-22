import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { workspaceRepository } from '../../../data-access';
import { useWorkspaceAccounts } from '../../workspace';
import type { BtpAccount } from './btpTypes';

interface BtpAccountContextValue {
  accounts: BtpAccount[];
  /** Connects an account; the store gives it its id and the provider's sample cost data under its name. */
  addAccount: (account: Omit<BtpAccount, 'id'>) => BtpAccount;
  removeAccount: (id: string) => void;
  renameAccount: (id: string, name: string) => void;
  getAccount: (id: string) => BtpAccount | undefined;
}

const BtpAccountContext = createContext<BtpAccountContextValue | undefined>(undefined);

/** Mirrors the reference CCM app's btp/context/BtpAccountContext.jsx — same
 * nested-route pattern as AWS/GCP; the accounts are the organisation's
 * connected BTP accounts in the workspace store (see AwsAccountContext.tsx). */
export function BtpAccountProvider({ children }: { children: ReactNode }) {
  const accounts = useWorkspaceAccounts('btp');

  const addAccount = useCallback((account: Omit<BtpAccount, 'id'>) => workspaceRepository.addConnectedAccount('btp', account), []);
  const removeAccount = useCallback((id: string) => { workspaceRepository.removeAccount('btp', id); }, []);
  const renameAccount = useCallback((id: string, name: string) => workspaceRepository.renameAccount('btp', id, name), []);
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
