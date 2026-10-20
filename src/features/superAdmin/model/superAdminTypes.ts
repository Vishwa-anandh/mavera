import type { CloudProvider } from '../../../shared/types/auth';
import type { OrganizationRecord } from '../../../data-access';

/** The 3 platform modules a super admin subscribes an org to. Mirrors
 * User.modules in src/shared/types/auth.ts — the same shape the org-side app reads
 * from its own session once a real backend sends it. */
export interface OrgModules {
  cloudCost: boolean;
  sapMonitoring: boolean;
}

/**
 * An organization as the super admin sees it. Field names follow the
 * reference CCM app's real super-admin API contract (`max_users`,
 * `ai_enabled`, `cloud_access`, `invoice_only`, `starts_at`, `expires_at` —
 * camelCased to match this codebase's convention), plus `modules`, which is
 * Mavera's own 3-module subscription concept layered on top — the reference
 * app's Dashboard.jsx has no equivalent (it's a single-product tool), so
 * there's no prior art to match field names against for that one field.
 * An org's entitlement is described by its module subscriptions and seat
 * limit; `plan` (Basic or Premium) only records which license it registered
 * with and is absent for orgs a super admin onboarded by hand.
 */
export type Organization = OrganizationRecord;

/** Platform-wide Maitsys CSP discount rate per provider — not per-org,
 * matching the reference app's separate global "MSP Rates" tab. */
export interface MspRate {
  provider: CloudProvider;
  rate: number;
  label: string;
  updatedAt: string;
  updatedBy: string;
}

export const MAX_USER_OPTIONS = [5, 10, 25, 50, 100, 250, 0];
export const CLOUD_PROVIDER_OPTIONS: CloudProvider[] = ['azure', 'aws', 'btp', 'gcp'];

export const MODULE_DEFS: Array<{ key: keyof OrgModules; label: string }> = [
  { key: 'cloudCost', label: 'Cloud Cost' },
  { key: 'sapMonitoring', label: 'SAP Monitoring' },
];
