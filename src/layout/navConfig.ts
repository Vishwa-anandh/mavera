import type { PermissionSet } from '../lib/permissions';

interface NavLeafDef {
  key: string;
  label: string;
  path: string;
  locked?: (permissions: PermissionSet) => boolean;
}

type NavNodeDef =
  | ({ type: 'leaf' } & NavLeafDef)
  | {
      type: 'group';
      key: string;
      label: string;
      visible?: (permissions: PermissionSet) => boolean;
      children: NavLeafDef[];
    };

const NAV_TREE: NavNodeDef[] = [
  { type: 'leaf', key: 'dashboard', label: 'Dashboard', path: '/' },
  {
    type: 'group',
    key: 'cloud-costs',
    label: 'Cloud Costs',
    children: [
      { key: 'azure', label: 'Azure', path: '/azure', locked: (p) => !p.azure.canView || !p.azure.orgHasAccess },
      { key: 'aws', label: 'AWS', path: '/aws', locked: (p) => !p.aws.canView || !p.aws.orgHasAccess },
      { key: 'btp', label: 'SAP BTP', path: '/btp', locked: (p) => !p.btp.canView || !p.btp.orgHasAccess },
      { key: 'gcp', label: 'Google Cloud', path: '/gcp', locked: (p) => !p.gcp.canView || !p.gcp.orgHasAccess },
    ],
  },
  {
    type: 'group',
    key: 'optimisation',
    label: 'Optimisation',
    children: [
      { key: 'recommendations', label: 'Recommendations', path: '/recommendations' },
      { key: 'smart-alerts', label: 'Smart Alerts', path: '/smart-alerts' },
    ],
  },
  {
    type: 'group',
    key: 'operations',
    label: 'Operations',
    children: [{ key: 'invoices', label: 'Invoices', path: '/invoices' }],
  },
  {
    type: 'group',
    key: 'governance',
    label: 'Governance',
    children: [
      {
        key: 'budgets',
        label: 'Budgets & Alerts',
        path: '/budgets',
        // Matches the reference app's own gating exactly (GCP is excluded
        // from this OR-check there too) — a known quirk in the reference
        // app, reproduced rather than silently "fixed" here.
        locked: (p) => !(p.isPrivileged || p.azure.canView || p.aws.canView || p.btp.canView),
      },
    ],
  },
  {
    type: 'group',
    key: 'account',
    label: 'Account',
    children: [{ key: 'subscription', label: 'Subscription', path: '/subscription' }],
  },
  {
    type: 'group',
    key: 'administration',
    label: 'Administration',
    visible: (p) => p.isPrivileged,
    children: [
      { key: 'users', label: 'User Management', path: '/users' },
      { key: 'sync-logs', label: 'Sync Logs', path: '/sync-logs' },
    ],
  },
];

export interface ResolvedNavLeaf {
  key: string;
  label: string;
  path: string;
  locked: boolean;
}

export type ResolvedNavEntry =
  | ({ type: 'leaf' } & ResolvedNavLeaf)
  | { type: 'group'; key: string; label: string; children: ResolvedNavLeaf[] };

export function resolveNav(permissions: PermissionSet): ResolvedNavEntry[] {
  return NAV_TREE.filter((node) => (node.type === 'group' && node.visible ? node.visible(permissions) : true)).map(
    (node): ResolvedNavEntry => {
      if (node.type === 'leaf') {
        return {
          type: 'leaf',
          key: node.key,
          label: node.label,
          path: node.path,
          locked: node.locked?.(permissions) ?? false,
        };
      }
      return {
        type: 'group',
        key: node.key,
        label: node.label,
        children: node.children.map((leaf) => ({
          key: leaf.key,
          label: leaf.label,
          path: leaf.path,
          locked: leaf.locked?.(permissions) ?? false,
        })),
      };
    },
  );
}
