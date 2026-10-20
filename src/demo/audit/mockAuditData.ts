import type { AuditActor, AuditEventRecord } from '../../data-access';

const SARAH: AuditActor = { name: 'Sarah Johnson', email: 'sarah.johnson@maitsys.com', kind: 'admin', role: 'Admin' };
const OWNER: AuditActor = { name: 'Dev Preview', email: 'demo@mavera.local', kind: 'admin', role: 'Owner' };
const MARCUS: AuditActor = { name: 'Marcus Chen', email: 'marcus.chen@maitsys.com', kind: 'member', role: 'Analyst' };
const PRIYA: AuditActor = { name: 'Priya Sharma', email: 'priya.sharma@maitsys.com', kind: 'member', role: 'Cost Auditor' };
const TOM: AuditActor = { name: 'Tom Wu', email: 'tom.wu@maitsys.com', kind: 'member', role: 'SAP Operator' };

type Seed = Omit<AuditEventRecord, 'id' | 'at' | 'actorName' | 'actorEmail' | 'actorKind' | 'actorRole'> & {
  actor: AuditActor;
  /** Hours before "now". */
  ago: number;
};

const SEEDS: Seed[] = [
  { ago: 0.4, actor: TOM, action: 'Alert resolved', target: 'GRH · Dialog response time above 2s', module: 'SAP Monitoring', result: 'success', detail: 'Marked resolved after the workload spike cleared.', source: 'Web · 10.4.2.18' },
  { ago: 1.2, actor: OWNER, action: 'Signed in', target: 'demo@mavera.local', module: 'Authentication', result: 'success', detail: 'Email and password.', source: 'Web · 10.4.2.31' },
  { ago: 3.5, actor: MARCUS, action: 'Budget created', target: 'AWS production · $18,000 / month', module: 'Budgets', result: 'success', detail: 'Alerts at 80% and 100% of the limit.', source: 'Web · 10.4.2.22' },
  { ago: 6, actor: TOM, action: 'Security note uploaded', target: 'Note 3727078 · Missing authorisation check', module: 'SAP Monitoring', result: 'success', detail: 'Added to GRC and queued for the next status check.', source: 'Web · 10.4.2.18' },
  {
    ago: 9, actor: SARAH, action: 'Permission matrix saved', target: 'Role · SAP Operator', module: 'Access control', result: 'success', detail: '2 granted, 1 revoked.', source: 'Web · 10.4.1.9',
    changes: [
      { field: 'SAP Alerts', before: 'View, Export', after: 'View, Edit, Export' },
      { field: 'Transport Management', before: 'View, Export', after: 'View, Edit, Export' },
      { field: 'System Configuration', before: 'View, Edit', after: 'View' },
    ],
  },
  { ago: 14, actor: PRIYA, action: 'Report exported', target: 'Cost Analytics · September 2026 (CSV)', module: 'Cloud Cost', result: 'success', source: 'Web · 10.4.3.7' },
  { ago: 20, actor: SARAH, action: 'User added', target: 'tom.wu@maitsys.com', module: 'Access control', result: 'success', detail: 'Added as SAP Operator.', source: 'Web · 10.4.1.9' },
  { ago: 27, actor: MARCUS, action: 'Destination connected', target: 'AWS · 4821-5530-1177', module: 'Cloud accounts', result: 'success', detail: 'Credentials validated; first sync queued.', source: 'Web · 10.4.2.22' },
  { ago: 30, actor: MARCUS, action: 'Destination connection failed', target: 'AWS · 4821-5530-9902', module: 'Cloud accounts', result: 'failure', detail: 'AccessDenied: the role could not be assumed. Check the trust policy.', source: 'Web · 10.4.2.22' },
  {
    ago: 36, actor: SARAH, action: 'Role changed', target: 'marcus.chen@maitsys.com', module: 'Access control', result: 'success', detail: 'Moved from Viewer to Analyst.', source: 'Web · 10.4.1.9',
    changes: [{ field: 'Role', before: 'Viewer', after: 'Analyst' }],
  },
  { ago: 44, actor: TOM, action: 'Manual re-sync', target: 'Azure · Production subscription', module: 'Sync', result: 'success', detail: 'Completed in 41s.', source: 'Web · 10.4.2.18' },
  { ago: 52, actor: OWNER, action: 'Subscription requested', target: 'SAP Monitoring · +5 seats', module: 'Subscription', result: 'success', detail: 'Request sent to Maitsys; confirmation by email.', source: 'Web · 10.4.2.31' },
  {
    ago: 58, actor: SARAH, action: 'Alerts turned off', target: 'priya.sharma@maitsys.com', module: 'Access control', result: 'success', detail: 'Alert e-mails switched off for this member.', source: 'Web · 10.4.1.9',
    changes: [{ field: 'Alert e-mails', before: 'On', after: 'Off' }],
  },
  { ago: 73, actor: PRIYA, action: 'Sign-in failed', target: 'priya.sharma@maitsys.com', module: 'Authentication', result: 'failure', detail: 'Wrong password (attempt 1 of 5).', source: 'Web · 203.0.113.54' },
  { ago: 73.1, actor: PRIYA, action: 'Signed in', target: 'priya.sharma@maitsys.com', module: 'Authentication', result: 'success', detail: 'Email and password.', source: 'Web · 203.0.113.54' },
  { ago: 80, actor: SARAH, action: 'Role created', target: 'Role · Cost Auditor', module: 'Access control', result: 'success', detail: 'Created with read and export access only.', source: 'Web · 10.4.1.9' },
  { ago: 96, actor: TOM, action: 'Alert acknowledged', target: 'GRQ · Update task failed', module: 'SAP Monitoring', result: 'success', source: 'Web · 10.4.2.18' },
  {
    ago: 101, actor: MARCUS, action: 'Smart alert rule changed', target: 'Cost anomaly · Azure', module: 'Smart alerts', result: 'success', detail: 'Sensitivity changed from Medium to High.', source: 'Web · 10.4.2.22',
    changes: [{ field: 'Sensitivity', before: 'Medium', after: 'High' }],
  },
  { ago: 120, actor: SARAH, action: 'User deactivated', target: 'diego.fernandez@maitsys.com', module: 'Access control', result: 'success', detail: 'Seat released. History kept.', source: 'Web · 10.4.1.9' },
  { ago: 124, actor: MARCUS, action: 'Invoice downloaded', target: 'INV-2026-0914', module: 'Billing', result: 'success', source: 'Web · 10.4.2.22' },
  {
    ago: 144, actor: OWNER, action: 'Role changed', target: 'sarah.johnson@maitsys.com', module: 'Access control', result: 'success', detail: 'Moved from Owner to Admin after ownership was confirmed with Maitsys.', source: 'Web · 10.4.2.31',
    changes: [{ field: 'Role', before: 'Owner', after: 'Admin' }],
  },
  { ago: 150, actor: TOM, action: 'Access denied', target: 'User Management', module: 'Access control', result: 'denied', detail: 'SAP Operator does not have View on User Management.', source: 'Web · 10.4.2.18' },
  { ago: 168, actor: SARAH, action: 'Budget created', target: 'GCP analytics · $6,500 / month', module: 'Budgets', result: 'success', detail: 'Alert at 90% of the limit.', source: 'Web · 10.4.1.9' },
  { ago: 192, actor: TOM, action: 'Destination connected', target: 'SAP BTP · Global account maitsys-prod', module: 'Cloud accounts', result: 'success', source: 'Web · 10.4.2.18' },
  { ago: 215, actor: PRIYA, action: 'Report exported', target: 'Resource Inventory (CSV)', module: 'Cloud Cost', result: 'success', source: 'Web · 10.4.3.7' },
  {
    ago: 240, actor: SARAH, action: 'Permission matrix saved', target: 'Role · Cost Auditor', module: 'Access control', result: 'success', detail: '2 granted.', source: 'Web · 10.4.1.9',
    changes: [{ field: 'Audit Trail', before: 'No access', after: 'View, Export' }, { field: 'Subscription', before: 'No access', after: 'View' }],
  },
  { ago: 266, actor: MARCUS, action: 'Alert resolved', target: 'Azure · Storage egress anomaly', module: 'Smart alerts', result: 'success', detail: 'Confirmed as a planned migration.', source: 'Web · 10.4.2.22' },
  { ago: 290, actor: SARAH, action: 'Signed in', target: 'sarah.johnson@maitsys.com', module: 'Authentication', result: 'success', detail: 'Email and password.', source: 'Web · 10.4.1.9' },
];

/** The sample feed, dated relative to `now` so the timeline always starts with recent days. Newest first. */
export function buildSeedAuditEvents(now: Date): AuditEventRecord[] {
  return SEEDS.map((seed, index) => {
    const { actor, ago, ...rest } = seed;
    return {
      ...rest,
      id: `aud-seed-${String(index + 1).padStart(3, '0')}`,
      at: new Date(now.getTime() - ago * 3_600_000).toISOString(),
      actorName: actor.name,
      actorEmail: actor.email,
      actorKind: actor.kind,
      actorRole: actor.role,
    };
  }).sort((a, b) => b.at.localeCompare(a.at));
}

/**
 * Events that "arrive" when the feed is re-synced (the prototype has no server to poll). Each manual
 * re-sync delivers the next one or two, stamped with the time of the sync.
 */
export function buildPendingAuditEvents(): Array<Omit<AuditEventRecord, 'id' | 'at'>> {
  const base = (actor: AuditActor) => ({ actorName: actor.name, actorEmail: actor.email, actorKind: actor.kind, actorRole: actor.role });
  return [
    { ...base(MARCUS), action: 'Signed in', target: 'marcus.chen@maitsys.com', module: 'Authentication', result: 'success' as const, detail: 'Email and password.', source: 'Web · 10.4.2.22' },
    { ...base(TOM), action: 'Alert acknowledged', target: 'GRC · Job BI_PROCESS_LOAD cancelled', module: 'SAP Monitoring', result: 'success' as const, source: 'Web · 10.4.2.18' },
    { ...base(PRIYA), action: 'Report exported', target: 'Invoices · Q3 2026 (CSV)', module: 'Billing', result: 'success' as const, source: 'Web · 10.4.3.7' },
    { ...base(SARAH), action: 'Signed in', target: 'sarah.johnson@maitsys.com', module: 'Authentication', result: 'success' as const, detail: 'Email and password.', source: 'Web · 10.4.1.9' },
  ];
}
