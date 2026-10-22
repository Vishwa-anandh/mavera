import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { workspaceRepository } from '../../../data-access';
import { useWorkspaceAccounts } from '../../workspace';
import type { AwsAccount } from './awsTypes';

interface AwsAccountContextValue {
  accounts: AwsAccount[];
  /** Connects an account; the store gives it its id and the provider's sample cost data under its name. */
  addAccount: (account: Omit<AwsAccount, 'id'>) => AwsAccount;
  removeAccount: (id: string) => void;
  renameAccount: (id: string, name: string) => void;
  getAccount: (id: string) => AwsAccount | undefined;
}

const AwsAccountContext = createContext<AwsAccountContextValue | undefined>(undefined);

/**
 * Mirrors the reference CCM app's aws/context/AccountContext.jsx: AWS uses
 * real nested routes (/aws, /aws/accounts, /aws/account/:id), not a
 * view-state switcher. No real backend exists for this prototype, so the
 * accounts are the organisation's connected AWS accounts in the workspace
 * store (data-access `workspaceRepository`) rather than `GET /aws/accounts`:
 * a rename/add/delete survives navigating away, and a brand-new organisation
 * starts with none.
 */
export function AwsAccountProvider({ children }: { children: ReactNode }) {
  const accounts = useWorkspaceAccounts('aws');

  const addAccount = useCallback((account: Omit<AwsAccount, 'id'>) => workspaceRepository.addConnectedAccount('aws', account), []);
  const removeAccount = useCallback((id: string) => { workspaceRepository.removeAccount('aws', id); }, []);
  const renameAccount = useCallback((id: string, name: string) => workspaceRepository.renameAccount('aws', id, name), []);
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
