import type { ComponentType } from 'react';
import type { PermissionSet } from '../../shared/lib/permissions';
import type { AuthContextValue } from '../../features/auth';
import type { ModuleId } from '../../features/access';
import { ServerIcon, CloudIcon, HomeIcon } from '../../shared/ui/icons';

export type NavFeatures = AuthContextValue['features'];

/**
 * Subscription-derived inputs, alongside the user's permissions. Mirrors the
 * reference app's components/Sidebar.jsx, which gates on `user.features.*`
 * and on the org's invoice-only / hybrid mode.
 */
export type NavModules = AuthContextValue['modules'];

export interface NavContext {
  features: NavFeatures;
  invoiceOnly: boolean;
  modules: NavModules;
  /**
   * Role-based access: true when the signed-in member's role may VIEW the module. Left out (tests, or
   * outside the provider) every destination is shown; the administration pages then fall back to the
   * legacy owner/admin check. Hiding a link is a convenience, never the security boundary.
   */
  canView?: (module: ModuleId) => boolean;
}

const ALL_FEATURES: NavFeatures = {
  budgets: true,
  smartAlerts: true,
  syncLogs: true,
  recommendations: true,
  cloudManagement: true,
  invoices: true,
};

const ALL_MODULES: NavModules = { cloudCost: true, sapMonitoring: true };

type NavPredicate = (permissions: PermissionSet, context: NavContext) => boolean;

/**
 * The access-control module behind each destination (keys are the leaf keys below); a leaf whose
 * module the member's role cannot VIEW is hidden. Kept in step with the route manifest by a test.
 */
export const NAV_MODULES: Record<string, ModuleId> = {
  dashboard: 'dashboard',
  'sap-systems': 'sap.overview',
  'sap-databases': 'sap.hana',
  'sap-performance': 'sap.performance',
  'sap-jobs': 'sap.jobs',
  'sap-alerts': 'sap.alerts',
  'sap-transport': 'sap.transport',
  'sap-security-notes': 'sap.securityNotes',
  'sap-btp-security': 'sap.btpSecurity',
  'sap-config': 'sap.configuration',
  'cloud-overview': 'cost.overview',
  'cloud-analytics': 'cost.analytics',
  azure: 'provider.azure',
  aws: 'provider.aws',
  btp: 'provider.btp',
  gcp: 'provider.gcp',
  'cloud-optimization': 'cost.optimization',
  'cloud-reservations': 'cost.reservations',
  'cloud-resources': 'cost.resources',
  budgets: 'budgets',
  'smart-alerts': 'smartAlerts',
  invoices: 'invoices',
  billing: 'billing',
  'ai-assistant': 'assistant',
  users: 'users',
  'audit-trail': 'audit',
  'sync-logs': 'syncLogs',
};

/** Administration pages: the role decides when roles are in force, otherwise only owners and admins see them. */
const adminPage: NavPredicate = (p, c) => (c.canView ? true : p.isPrivileged);

/** Hybrid = invoice-only flag but cloud providers also configured. */
const isPureInvoiceOnly: NavPredicate = (p, c) => c.invoiceOnly && !p.isHybridOrg;
/** True cloud-resource views (subscriptions, analytics, reservations, …)
 * need a connected cloud account, same as the four provider pages. */
const needsCloudResource: NavPredicate = (p, c) => !isPureInvoiceOnly(p, c);

type NavIcon = ComponentType<{ size?: number; className?: string }>;

interface NavLeafDef {
  key: string;
  label: string;
  path: string;
  /** Heading this destination sits under inside its module's dropdown.
   * Consecutive children with the same section render as one labelled group. */
  section?: string;
  /** Extra words the page search matches on (e.g. SAP transaction codes). */
  keywords?: string;
  /** Only set on top-level destinations — dropdown rows don't carry one. */
  icon?: NavIcon;
  locked?: NavPredicate;
  visible?: NavPredicate;
}

type NavNodeDef =
  | ({ type: 'leaf' } & NavLeafDef)
  | {
      type: 'group';
      key: string;
      label: string;
      icon?: NavIcon;
      /** Dropdown header, when it differs from the trigger label
       * (MAVERA_DESIGN_SYSTEM.md §6.1: "Cloud Cost" trigger, "Cloud Cost
       * Monitoring" dropdown title). */
      menuTitle?: string;
      /** Short label rendered beside the trigger, e.g. Cloud Cost's "Pro". */
      badge?: string;
      visible?: NavPredicate;
      children: NavLeafDef[];
    };

/**
 * Order and destinations: Dashboard → SAP Monitoring → Cloud Cost → IDoc
 * Monitoring, matching the reference layout the product owner
 * asked to match exactly (AI Assistant was removed from the header — it's
 * still reachable via the floating assistant widget). Cloud Cost, IDoc
 * Monitoring and SAP Monitoring are each whole-module subscriptions the
 * super admin grants per
 * org (see NavModules / User.modules) — every destination under a disabled
 * module is hidden here, matching how the reference app's own Sidebar.jsx
 * gates on org-level module flags rather than per-feature ones. The Cloud
 * Cost dropdown
 * flattens what used to be four separate top-level groups
 * (cloud-costs/optimisation/operations/governance) into one "Cloud Cost ▾"
 * menu, preserving each item's original locked/visible predicate. AWS, SAP
 * BTP, Google Cloud, Smart Alerts and Invoices are real, already-tested
 * destinations backed by the actual permission model — kept here per §11
 * ("retain established application routes"). Alerts is no longer a
 * top-level destination (the reference layout doesn't have one); its route
 * stays reachable from the dashboard's "Recent Alerts → View all" link.
 */
const NAV_TREE: NavNodeDef[] = [
  { type: 'leaf', key: 'dashboard', label: 'Dashboard', path: '/', icon: HomeIcon, keywords: 'home start' },
  {
    type: 'group',
    key: 'sap',
    label: 'SAP Monitoring',
    icon: ServerIcon,
    visible: (_p, c) => c.modules.sapMonitoring,
    children: [
      { key: 'sap-systems', section: 'Systems', label: 'SAP Overview', path: '/sap/systems', keywords: 'landscape sid instances system health availability uptime' },
      { key: 'sap-databases', section: 'Systems', label: 'HANA/DB Monitoring', path: '/sap/databases', keywords: 'hana database db02 memory' },
      { key: 'sap-performance', section: 'Systems', label: 'Performance', path: '/sap/performance', keywords: 'st03 response time workload' },
      { key: 'sap-jobs', section: 'Operations', label: 'Jobs & Dumps', path: '/sap/jobs', keywords: 'sm37 background batch st22 short dumps abap runtime errors' },
      { key: 'sap-alerts', section: 'Operations', label: 'Alerts & Escalations', path: '/sap/alerts', keywords: 'incidents' },
      { key: 'sap-transport', section: 'Operations', label: 'Transport Management', path: '/sap/transport-management', keywords: 'stms transports' },
      { key: 'sap-security-notes', section: 'Security', label: 'Security Notes', path: '/sap/security-notes', keywords: 'patches snotes' },
      { key: 'sap-btp-security', section: 'Security', label: 'BTP Security Assessment', path: '/sap/btp-security' },
      { key: 'sap-config', section: 'Settings', label: 'System Configuration', path: '/sap/configuration', keywords: 'connect add system rfc' },
    ],
  },
  {
    type: 'group',
    key: 'cloud-cost',
    label: 'Cloud Cost',
    icon: CloudIcon,
    menuTitle: 'Cloud Cost Monitoring',
    visible: (_p, c) => c.modules.cloudCost,
    children: [
      { key: 'cloud-overview', section: 'Overview', label: 'Cost Overview', path: '/cloud/overview', visible: needsCloudResource, keywords: 'spend summary' },
      { key: 'cloud-analytics', section: 'Overview', label: 'Cost Analytics', path: '/cloud/analytics', visible: needsCloudResource, keywords: 'trends breakdown reports export download csv' },
      { key: 'azure', section: 'Cloud providers', label: 'Azure Subscriptions', path: '/azure', locked: (p) => !p.azure.canView || !p.azure.orgHasAccess, visible: needsCloudResource, keywords: 'microsoft' },
      { key: 'aws', section: 'Cloud providers', label: 'AWS', path: '/aws', locked: (p) => !p.aws.canView || !p.aws.orgHasAccess, visible: needsCloudResource, keywords: 'amazon web services' },
      { key: 'btp', section: 'Cloud providers', label: 'SAP BTP', path: '/btp', locked: (p) => !p.btp.canView || !p.btp.orgHasAccess, visible: needsCloudResource, keywords: 'business technology platform' },
      { key: 'gcp', section: 'Cloud providers', label: 'Google Cloud', path: '/gcp', locked: (p) => !p.gcp.canView || !p.gcp.orgHasAccess, visible: needsCloudResource, keywords: 'gcp' },
      { key: 'cloud-optimization', section: 'Optimization', label: 'Savings & Optimization', path: '/cloud/optimization', visible: needsCloudResource, keywords: 'rightsizing idle savings recommendations msp advisor' },
      { key: 'cloud-reservations', section: 'Optimization', label: 'Reserved Instances', path: '/cloud/reservations', visible: needsCloudResource, keywords: 'savings plans commitments ri' },
      { key: 'cloud-resources', section: 'Optimization', label: 'Resource Inventory', path: '/cloud/resources', visible: needsCloudResource, keywords: 'vms assets' },
      {
        key: 'budgets',
        section: 'Governance',
        label: 'Budgets & Alerts',
        path: '/budgets',
        keywords: 'limits thresholds',
        // Reference's own OR-check excludes GCP here — reproduced rather
        // than silently "fixed".
        locked: (p, c) => !c.features.budgets || !(p.isPrivileged || p.azure.canView || p.aws.canView || p.btp.canView),
      },
      { key: 'smart-alerts', section: 'Governance', label: 'Smart Alerts', path: '/smart-alerts', locked: (_p, c) => !c.features.smartAlerts, keywords: 'anomalies' },
      // The cross-module alert list used to be reachable only from a Dashboard link. Its route is open to every member, so the
      // menu entry follows the Smart Alerts permission only to keep a role that cannot see alerts from being offered it.
      { key: 'alerts', section: 'Governance', label: 'All Alerts', path: '/alerts', visible: (_p, c) => (c.canView ? c.canView('smartAlerts') : true), keywords: 'alarms incidents critical warnings notifications' },
      // Billing and Reports moved here from the top level at the product owner's request
      // (a deliberate deviation from MAVERA_DESIGN_SYSTEM.md §6.1). Both stay visible to
      // invoice-only orgs, but are hidden with the rest of Cloud Cost when the org isn't
      // subscribed to that module (the profile menu keeps a Billing link for those orgs).
      // Invoices is for every organisation that has the module: uploading one is the quickest way to see
      // CSP savings, and hiding the page from cloud-account orgs cost four clicks to reach it.
      { key: 'invoices', section: 'Billing & reports', label: 'Invoices', path: '/invoices', keywords: 'upload bill pdf spend csp savings' },
      { key: 'billing', section: 'Billing & reports', label: 'Billing', path: '/billing', keywords: 'invoices payment pay' },
    ],
  },
  {
    type: 'group',
    key: 'administration',
    label: 'Administration',
    // Invoice Builder is a Maitsys super-admin tool (Super Admin portal › Billing), not an org page.
    children: [
      { key: 'users', label: 'User Management', path: '/users', visible: adminPage, keywords: 'invite people roles permissions members seats' },
      { key: 'audit-trail', label: 'Audit Trail', path: '/audit-trail', visible: adminPage, keywords: 'audit log signal timeline governance ledger activity history who did what security events' },
      { key: 'sync-logs', label: 'Sync Logs', path: '/sync-logs', visible: adminPage, locked: (_p, c) => !c.features.syncLogs, keywords: 'data import history' },
    ],
  },
];

export interface ResolvedNavLeaf {
  key: string;
  label: string;
  path: string;
  locked: boolean;
  section?: string;
  keywords?: string;
}

export interface NavSection {
  key: string;
  /** Undefined for a group whose children carry no section (e.g. Administration). */
  label?: string;
  children: ResolvedNavLeaf[];
}

/** Splits a group's visible children into its labelled sections, keeping their order.
 * A section whose every item is hidden simply doesn't appear. */
export function navSections(children: ResolvedNavLeaf[]): NavSection[] {
  const sections: NavSection[] = [];
  for (const leaf of children) {
    const last = sections[sections.length - 1];
    if (last && last.label === leaf.section) last.children.push(leaf);
    else sections.push({ key: leaf.section ?? leaf.key, label: leaf.section, children: [leaf] });
  }
  return sections;
}

/** How many columns a module dropdown needs: roughly seven rows per column, never more columns
 * than sections, so a short or partly-hidden menu stays a single list. */
export function navMenuColumns(children: ResolvedNavLeaf[]): number {
  const sections = navSections(children).length;
  return Math.max(1, Math.min(3, sections, Math.ceil(children.length / 7)));
}

/**
 * Splits sections (in order) into `columns` columns so the tallest column is as short as
 * possible — each section weighs its rows plus one for its heading. Menus have at most a
 * handful of sections, so trying every split is cheap.
 */
export function navColumnLayout(sections: NavSection[], columns: number): NavSection[][] {
  const weight = (list: NavSection[]) => list.reduce((sum, section) => sum + section.children.length + (section.label ? 1 : 0), 0);
  const best = (start: number, remaining: number): { height: number; layout: NavSection[][] } => {
    const rest = sections.slice(start);
    if (remaining <= 1 || rest.length <= 1) return { height: weight(rest), layout: [rest] };
    let winner = { height: Infinity, layout: [rest] };
    for (let end = start + 1; end < sections.length; end += 1) {
      const head = sections.slice(start, end);
      const tail = best(end, remaining - 1);
      const height = Math.max(weight(head), tail.height);
      if (height < winner.height) winner = { height, layout: [head, ...tail.layout] };
    }
    return winner;
  };
  return best(0, Math.max(1, columns)).layout;
}

/** True when `pathname` is `path` or a page beneath it (`/azure/123` is under `/azure`).
 * The dashboard (`/`) only matches itself. */
export function isNavPathActive(path: string, pathname: string): boolean {
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
}

export type ResolvedNavEntry =
  | ({ type: 'leaf'; icon?: NavIcon } & ResolvedNavLeaf)
  | { type: 'group'; key: string; label: string; icon?: NavIcon; badge?: string; menuTitle: string; children: ResolvedNavLeaf[] };

function resolveLeaf(leaf: NavLeafDef, permissions: PermissionSet, context: NavContext): ResolvedNavLeaf {
  return {
    key: leaf.key,
    label: leaf.label,
    path: leaf.path,
    locked: leaf.locked?.(permissions, context) ?? false,
    section: leaf.section,
    keywords: leaf.keywords,
  };
}

export function resolveNav(
  permissions: PermissionSet,
  context: NavContext = { features: ALL_FEATURES, invoiceOnly: false, modules: ALL_MODULES },
): ResolvedNavEntry[] {
  const isVisible = (node: { key: string; visible?: NavPredicate }) => {
    if (!(node.visible?.(permissions, context) ?? true)) return false;
    const module = NAV_MODULES[node.key];
    return !module || !context.canView || context.canView(module);
  };

  return NAV_TREE.filter(isVisible).flatMap((node): ResolvedNavEntry[] => {
    if (node.type === 'leaf') {
      return [{ type: 'leaf', icon: node.icon, ...resolveLeaf(node, permissions, context) }];
    }
    const children = node.children.filter(isVisible).map((leaf) => resolveLeaf(leaf, permissions, context));
    // A group whose every child is hidden is hidden too.
    return children.length > 0
      ? [{ type: 'group', key: node.key, label: node.label, icon: node.icon, badge: node.badge, menuTitle: node.menuTitle ?? node.label, children }]
      : [];
  });
}
