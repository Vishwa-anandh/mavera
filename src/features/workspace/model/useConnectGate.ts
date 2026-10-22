import { derivePermissions, isPrivileged } from '../../../shared/lib/permissions';
import { useAccess } from '../../access';
import { useAuth } from '../../auth';
import { sapAdminRepository, workspaceRepository } from '../../../data-access';
import { CONNECT_PROVIDERS, CONNECT_PROVIDER_ORDER, type ConnectProvider } from './connectProviders';
import { useWorkspaceVersion } from './useWorkspace';

export interface ConnectGate {
  /** The user may connect another one of these right now. */
  allowed: boolean;
  /** Why not: the module is not in the plan, the role is read-only, or the plan's account limit is used up. */
  reason?: 'plan' | 'readOnly' | 'limit' | 'permission';
  /** The sentence that explains the reason, as the connect pages have always worded it. */
  message?: string;
  /** Accounts connected so far and the plan's limit (0 = unlimited or none) for the providers that have one. */
  count: number;
  max: number;
}

/** Providers whose account count the plan limits, as the account managers enforce it. */
const LIMITED = ['azure', 'aws', 'btp'] as const;
type Limited = (typeof LIMITED)[number];

type Auth = ReturnType<typeof useAuth>;

function gateFor(provider: ConnectProvider, auth: Auth, canCreateSap: boolean): ConnectGate {
  const { user, cloudAccess, invoiceOnly, accountLimits, modules } = auth;
  const definition = CONNECT_PROVIDERS[provider];

  const subscribed = (modules ?? { cloudCost: true, sapMonitoring: true })[definition.module];
  if (!subscribed) return { allowed: false, reason: 'plan', message: `Your plan does not include ${definition.module === 'cloudCost' ? 'Cloud Cost' : 'SAP Monitoring'}.`, count: 0, max: 0 };

  if (provider === 'sap') {
    const count = sapAdminRepository.destinations.count();
    return canCreateSap
      ? { allowed: true, count, max: 0 }
      : { allowed: false, reason: 'permission', message: 'Your role cannot add SAP systems. Ask your administrator to connect one.', count, max: 0 };
  }

  const count = workspaceRepository.listAccounts(provider).length;
  const permissions = derivePermissions(user, cloudAccess ?? [], invoiceOnly ?? false);
  const readOnly = provider === 'azure' || provider === 'aws'
    ? permissions[provider].readOnly && !permissions.isPrivileged
    : !isPrivileged(user) && user?.[provider === 'gcp' ? 'canViewGcp' : 'canViewBtp'] === false;
  if (readOnly) return { allowed: false, reason: 'readOnly', message: `Read-only mode — contact your administrator to add or remove ${definition.label} accounts.`, count, max: 0 };

  const max = (LIMITED as readonly string[]).includes(provider) ? (accountLimits?.[provider as Limited] ?? 3) : 0;
  if (max > 0 && count >= max) {
    return { allowed: false, reason: 'limit', message: `Account limit reached — your plan allows up to ${max} ${definition.label} account${max === 1 ? '' : 's'}. Remove one or upgrade your plan to add another.`, count, max };
  }
  return { allowed: true, count, max };
}

/**
 * Whether the signed-in user may connect another account of each provider: the same module, read-only and
 * account-limit rules the Azure, AWS, GCP, BTP and System Configuration pages applied before the shared dialog
 * replaced their forms. Live: connecting an account moves the counts.
 */
export function useConnectGates(): Record<ConnectProvider, ConnectGate> {
  const auth = useAuth();
  const { can } = useAccess();
  useWorkspaceVersion();
  const canCreateSap = can('sap.configuration', 'CREATE');
  return Object.fromEntries(CONNECT_PROVIDER_ORDER.map((provider) => [provider, gateFor(provider, auth, canCreateSap)])) as Record<ConnectProvider, ConnectGate>;
}

/** The gate of one provider. */
export function useConnectGate(provider: ConnectProvider): ConnectGate {
  return useConnectGates()[provider];
}
