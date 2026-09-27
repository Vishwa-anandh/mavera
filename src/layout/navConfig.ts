import type { PermissionSet } from '../lib/permissions';
import type { AuthContextValue } from '../context/AuthContext';

export type NavFeatures = AuthContextValue['features'];

/**
 * Subscription-derived inputs, alongside the user's permissions. Mirrors the
 * reference app's components/Sidebar.jsx, which gates on `user.features.*`
 * and on the org's invoice-only / hybrid mode.
 */
export interface NavContext {
  features: NavFeatures;
  invoiceOnly: boolean;
}

const ALL_FEATURES: NavFeatures = {
  budgets: true,
  smartAlerts: true,
  syncLogs: true,
  recommendations: true,
  cloudManagement: true,
  invoices: true,
};

type NavPredicate = (permissions: PermissionSet, context: NavContext) => boolean;

/** Hybrid = invoice-only flag but cloud providers also configured. */
const isPureInvoiceOnly: NavPredicate = (p, c) => c.invoiceOnly && !p.isHybridOrg;

interface NavLeafDef {
  key: string;
  label: string;
  path: string;
  locked?: NavPredicate;
  visible?: NavPredicate;
}

type NavNodeDef =
  | ({ type: 'leaf' } & NavLeafDef)
  | {
      type: 'group';
      key: string;
      label: string;
      visible?: NavPredicate;
      children: NavLeafDef[];
    };

const NAV_TREE: NavNodeDef[] = [
  { type: 'leaf', key: 'dashboard', label: 'Dashboard', path: '/' },
  {
    type: 'group',
    key: 'cloud-costs',
    label: 'Cloud Costs',
    // Reference hides every cloud menu for a pure invoice-only org.
    visible: (p, c) => !isPureInvoiceOnly(p, c),
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
      {
        key: 'recommendations',
        label: 'Recommendations',
        path: '/recommendations',
        locked: (_p, c) => !c.features.recommendations,
      },
      { key: 'smart-alerts', label: 'Smart Alerts', path: '/smart-alerts', locked: (_p, c) => !c.features.smartAlerts },
    ],
  },
  {
    type: 'group',
    key: 'operations',
    label: 'Operations',
    children: [
      {
        key: 'invoices',
        label: 'Invoices',
        path: '/invoices',
        // Reference: shown only for invoice-only or hybrid orgs.
        visible: (p, c) => c.invoiceOnly || p.isHybridOrg,
      },
    ],
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
        // The subscription's budgets feature (reference Sidebar.jsx), plus
        // the reference's permission gate (GCP is excluded from this
        // OR-check there too — a known quirk in the reference app,
        // reproduced rather than silently "fixed" here).
        locked: (p, c) =>
          !c.features.budgets || !(p.isPrivileged || p.azure.canView || p.aws.canView || p.btp.canView),
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
      { key: 'sync-logs', label: 'Sync Logs', path: '/sync-logs', locked: (_p, c) => !c.features.syncLogs },
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

function resolveLeaf(leaf: NavLeafDef, permissions: PermissionSet, context: NavContext): ResolvedNavLeaf {
  return {
    key: leaf.key,
    label: leaf.label,
    path: leaf.path,
    locked: leaf.locked?.(permissions, context) ?? false,
  };
}

export function resolveNav(
  permissions: PermissionSet,
  context: NavContext = { features: ALL_FEATURES, invoiceOnly: false },
): ResolvedNavEntry[] {
  const isVisible = (node: { visible?: NavPredicate }) => node.visible?.(permissions, context) ?? true;

  return NAV_TREE.filter(isVisible).flatMap((node): ResolvedNavEntry[] => {
    if (node.type === 'leaf') {
      return [{ type: 'leaf', ...resolveLeaf(node, permissions, context) }];
    }
    const children = node.children.filter(isVisible).map((leaf) => resolveLeaf(leaf, permissions, context));
    // A group whose every child is hidden is hidden too.
    return children.length > 0 ? [{ type: 'group', key: node.key, label: node.label, children }] : [];
  });
}
