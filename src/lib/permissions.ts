import type { User, CloudProvider } from '../types/auth';

export interface ProviderPermissions {
  canView: boolean;
  readOnly: boolean;
  canWrite: boolean;
  orgHasAccess: boolean;
  allowConnect: boolean;
}

export interface PermissionSet {
  isPrivileged: boolean;
  isHybridOrg: boolean;
  canConnectCloud: boolean;
  azure: ProviderPermissions;
  aws: ProviderPermissions;
  btp: ProviderPermissions;
  gcp: ProviderPermissions;
}

const CLOUD_VIEW_FLAGS = {
  azure: 'canViewAzure',
  aws: 'canViewAws',
  btp: 'canViewBtp',
  gcp: 'canViewGcp',
} as const;

const CLOUD_READONLY_FLAGS = {
  azure: 'azureReadOnly',
  aws: 'awsReadOnly',
  btp: 'btpReadOnly',
  gcp: 'gcpReadOnly',
} as const;

const PROVIDERS = ['azure', 'aws', 'btp', 'gcp'] as const;

export function isPrivileged(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'owner';
}

export function derivePermissions(
  user: User | null,
  cloudAccess: CloudProvider[],
  invoiceOnly: boolean,
): PermissionSet {
  const privileged = isPrivileged(user);
  const isHybridOrg = invoiceOnly && cloudAccess.length > 0;
  const canConnectCloud = !invoiceOnly || isHybridOrg;

  const providers = PROVIDERS.reduce(
    (acc, provider) => {
      const canView = privileged || Boolean(user?.[CLOUD_VIEW_FLAGS[provider]]);
      const readOnly = !privileged && Boolean(user?.[CLOUD_READONLY_FLAGS[provider]]);
      const canWrite = canView && !readOnly;
      const orgHasAccess = cloudAccess.includes(provider);
      const allowConnect = canConnectCloud && orgHasAccess && canView && (canWrite || privileged);

      acc[provider] = { canView, readOnly, canWrite, orgHasAccess, allowConnect };
      return acc;
    },
    {} as Record<CloudProvider, ProviderPermissions>,
  );

  return {
    isPrivileged: privileged,
    isHybridOrg,
    canConnectCloud,
    azure: providers.azure,
    aws: providers.aws,
    btp: providers.btp,
    gcp: providers.gcp,
  };
}
