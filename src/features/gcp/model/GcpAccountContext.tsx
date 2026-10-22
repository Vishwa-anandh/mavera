import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { workspaceRepository } from '../../../data-access';
import { useWorkspaceAccounts } from '../../workspace';
import type { GcpAccount } from './gcpTypes';

interface GcpAccountContextValue {
  accounts: GcpAccount[];
  /** Connects a project; the store gives it its id and the provider's sample cost data under its name. */
  addAccount: (account: Omit<GcpAccount, 'id'>) => GcpAccount;
  removeAccount: (id: string) => void;
  getAccount: (id: string) => GcpAccount | undefined;
}

const GcpAccountContext = createContext<GcpAccountContextValue | undefined>(undefined);

/** Mirrors the reference CCM app's gcp/context/GcpAccountContext.jsx: GCP
 * uses real nested routes (/gcp, /gcp/accounts, /gcp/account/:id), same as
 * AWS. No real backend exists for this prototype, so the projects are the
 * organisation's connected GCP accounts in the workspace store (see
 * AwsAccountContext.tsx) instead of `GET /gcp/accounts`. */
export function GcpAccountProvider({ children }: { children: ReactNode }) {
  const accounts = useWorkspaceAccounts('gcp');

  const addAccount = useCallback((account: Omit<GcpAccount, 'id'>) => workspaceRepository.addConnectedAccount('gcp', account), []);
  const removeAccount = useCallback((id: string) => { workspaceRepository.removeAccount('gcp', id); }, []);
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
