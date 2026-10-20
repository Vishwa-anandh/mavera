/**
 * The access-control registry: every area of Mavera that a role can be granted something on, the
 * actions that make sense for it, and where it sits in the permission matrix. Pure data; the rules
 * that use it live in permissions.ts.
 */
export type PermissionAction = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'EXPORT';

/** Column order in the matrix. */
export const ACTIONS: readonly PermissionAction[] = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'];

export const ACTION_LABELS: Record<PermissionAction, string> = {
  VIEW: 'View',
  CREATE: 'Create',
  EDIT: 'Edit',
  DELETE: 'Delete',
  EXPORT: 'Export',
};

export type ModuleGroupId = 'overview' | 'cloud-cost' | 'cloud-providers' | 'governance' | 'sap' | 'administration';

export const MODULE_GROUPS: ReadonlyArray<{ id: ModuleGroupId; label: string; description: string }> = [
  { id: 'overview', label: 'Overview', description: 'Landing page and the assistant.' },
  { id: 'cloud-cost', label: 'Cloud Cost', description: 'Spend, analytics and savings.' },
  { id: 'cloud-providers', label: 'Cloud providers', description: 'Connected cloud accounts.' },
  { id: 'governance', label: 'Budgets, alerts and billing', description: 'Limits, alerting and invoices.' },
  { id: 'sap', label: 'SAP Monitoring', description: 'Systems, operations and security.' },
  { id: 'administration', label: 'Administration', description: 'People, access, subscription and records.' },
];

export interface ModuleDefinition {
  id: string;
  label: string;
  group: ModuleGroupId;
  description: string;
  /** Actions that exist for this module. Anything else renders as "not applicable". */
  actions: readonly PermissionAction[];
  /** Actions only the Owner role can hold; they show as restricted for every other role. */
  ownerOnly?: readonly PermissionAction[];
}

const VIEW_EXPORT = ['VIEW', 'EXPORT'] as const;
const FULL = ['VIEW', 'CREATE', 'EDIT', 'DELETE'] as const;

export const MODULES = [
  { id: 'dashboard', label: 'Dashboard', group: 'overview', description: 'The home page: pulse, key figures and what needs attention.', actions: ['VIEW'] },
  { id: 'assistant', label: 'AI Assistant', group: 'overview', description: 'Ask questions and take guided tours.', actions: ['VIEW'] },

  { id: 'cost.overview', label: 'Cost Overview', group: 'cloud-cost', description: 'Month-to-date spend across providers.', actions: VIEW_EXPORT },
  { id: 'cost.analytics', label: 'Cost Analytics', group: 'cloud-cost', description: 'Trends, breakdowns and report exports.', actions: VIEW_EXPORT },
  { id: 'cost.optimization', label: 'Savings and Optimization', group: 'cloud-cost', description: 'Review and act on savings opportunities.', actions: ['VIEW', 'EDIT', 'EXPORT'] },
  { id: 'cost.reservations', label: 'Reserved Instances', group: 'cloud-cost', description: 'Reservations and savings plans.', actions: VIEW_EXPORT },
  { id: 'cost.resources', label: 'Resource Inventory', group: 'cloud-cost', description: 'Every resource with its cost and tags.', actions: VIEW_EXPORT },

  { id: 'provider.azure', label: 'Azure', group: 'cloud-providers', description: 'Azure subscriptions and their costs.', actions: FULL },
  { id: 'provider.aws', label: 'AWS', group: 'cloud-providers', description: 'AWS accounts and their costs.', actions: FULL },
  { id: 'provider.gcp', label: 'Google Cloud', group: 'cloud-providers', description: 'Google Cloud projects and their costs.', actions: FULL },
  { id: 'provider.btp', label: 'SAP BTP', group: 'cloud-providers', description: 'SAP BTP global accounts and their costs.', actions: FULL },

  { id: 'budgets', label: 'Budgets', group: 'governance', description: 'Spend limits and threshold alerts.', actions: FULL },
  { id: 'smartAlerts', label: 'Smart Alerts', group: 'governance', description: 'Anomaly and policy alerts.', actions: FULL },
  { id: 'invoices', label: 'Invoices', group: 'governance', description: 'Invoices issued to your organisation.', actions: VIEW_EXPORT },
  { id: 'billing', label: 'Billing', group: 'governance', description: 'Payment details and billing contacts.', actions: ['VIEW', 'EDIT'] },

  { id: 'sap.overview', label: 'SAP Overview', group: 'sap', description: 'Landscape health and availability.', actions: VIEW_EXPORT },
  { id: 'sap.hana', label: 'HANA/DB Monitoring', group: 'sap', description: 'Memory, services and database vitals.', actions: VIEW_EXPORT },
  { id: 'sap.performance', label: 'Performance', group: 'sap', description: 'Response times and workload.', actions: VIEW_EXPORT },
  { id: 'sap.jobs', label: 'Jobs and Dumps', group: 'sap', description: 'Background jobs and ABAP short dumps.', actions: ['VIEW', 'EDIT', 'EXPORT'] },
  { id: 'sap.alerts', label: 'SAP Alerts', group: 'sap', description: 'Alerts and escalations; resolve and acknowledge.', actions: ['VIEW', 'EDIT', 'EXPORT'] },
  { id: 'sap.transport', label: 'Transport Management', group: 'sap', description: 'Transport requests and queues.', actions: ['VIEW', 'EDIT', 'EXPORT'] },
  { id: 'sap.securityNotes', label: 'Security Notes', group: 'sap', description: 'SAP security notes and their status.', actions: ['VIEW', 'EDIT', 'EXPORT'] },
  { id: 'sap.btpSecurity', label: 'BTP Security Assessment', group: 'sap', description: 'BTP security findings.', actions: ['VIEW', 'EDIT', 'EXPORT'] },
  { id: 'sap.configuration', label: 'System Configuration', group: 'sap', description: 'Connected SAP systems and destinations.', actions: FULL },

  { id: 'audit', label: 'Audit Trail', group: 'administration', description: 'Who did what, and when.', actions: VIEW_EXPORT },
  { id: 'users', label: 'User Management', group: 'administration', description: 'Members, seats and provider access.', actions: FULL },
  { id: 'roles', label: 'Roles and permissions', group: 'administration', description: 'Create roles and edit the permission matrix.', actions: FULL },
  { id: 'ownership', label: 'Ownership transfer', group: 'administration', description: 'Hand the organisation to another owner.', actions: ['EDIT'], ownerOnly: ['EDIT'] },
  { id: 'subscription', label: 'Subscription', group: 'administration', description: 'Plan, modules and seats.', actions: ['VIEW', 'EDIT'] },
  { id: 'syncLogs', label: 'Sync Logs', group: 'administration', description: 'Every cloud data fetch.', actions: VIEW_EXPORT },
] as const satisfies readonly ModuleDefinition[];

export type ModuleId = (typeof MODULES)[number]['id'];

const BY_ID = new Map<string, ModuleDefinition>(MODULES.map((module) => [module.id, module]));

export function moduleById(id: string): ModuleDefinition | undefined {
  return BY_ID.get(id);
}

export function isModuleId(value: string): value is ModuleId {
  return BY_ID.has(value);
}

export function modulesInGroup(group: ModuleGroupId): ModuleDefinition[] {
  return MODULES.filter((module) => module.group === group);
}
