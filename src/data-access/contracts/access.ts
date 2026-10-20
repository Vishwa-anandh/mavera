/**
 * Contracts for role-based access control (members, custom roles) and the audit trail.
 * Module and action keys are plain strings here; the access feature owns the registry that gives
 * them meaning and sanitises anything read back (a backend can add modules the UI doesn't know yet).
 */
export type AccessActionKey = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'EXPORT';

/** Granted actions per module id. A module that is absent has nothing granted. */
export type PermissionGrants = Record<string, AccessActionKey[]>;

export interface CustomRoleRecord {
  id: string;
  name: string;
  description: string;
  permissions: PermissionGrants;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export type MemberStatusKey = 'active' | 'inactive';
/** The legacy three-way role the organisation API still sends; the role id is the finer-grained one. */
export type LegacyMemberRole = 'admin' | 'owner' | 'member';

export interface MemberRecord {
  userId: string;
  fullName: string;
  email: string;
  role: LegacyMemberRole;
  /** System role id ('owner', 'admin', 'analyst', 'viewer') or a custom role id. */
  roleId?: string;
  status: MemberStatusKey;
  /** Receives alert e-mails. */
  alertsEnabled?: boolean;
  lastActiveAt?: string;
  canViewAzure?: boolean;
  canViewAws?: boolean;
  /** Reference quirk, kept intentionally: BTP view defaults to true (undefined counts as viewable). */
  canViewBtp?: boolean;
  canViewGcp?: boolean;
  azureReadOnly?: boolean;
  awsReadOnly?: boolean;
  btpReadOnly?: boolean;
  gcpReadOnly?: boolean;
}

/** Treat as immutable: the repository replaces the arrays on every write instead of changing them. */
export interface AccessSnapshot {
  customRoles: CustomRoleRecord[];
  members: MemberRecord[];
}

export type AuditActorKind = 'admin' | 'member';
export type AuditResult = 'success' | 'failure' | 'denied';

export interface AuditChange {
  field: string;
  before: string;
  after: string;
}

export interface AuditEventRecord {
  id: string;
  /** ISO timestamp. */
  at: string;
  actorName: string;
  actorEmail: string;
  actorKind: AuditActorKind;
  /** The actor's role as shown to people, e.g. "Owner". */
  actorRole: string;
  /** Short past-tense phrase, e.g. "Role changed". */
  action: string;
  target: string;
  /** The area of the product the event belongs to, e.g. "Access control". */
  module: string;
  result: AuditResult;
  /** Free-text context: what happened and why it matters. */
  detail?: string;
  /** Before/after values for permission or role changes. */
  changes?: AuditChange[];
  /** Where the request came from, e.g. "Web · 10.4.2.18". */
  source?: string;
}

export interface AuditActor {
  name: string;
  email: string;
  kind: AuditActorKind;
  role: string;
}

export type AuditEventInput = Omit<AuditEventRecord, 'id' | 'at' | 'actorName' | 'actorEmail' | 'actorKind' | 'actorRole' | 'result'> &
  Partial<Pick<AuditEventRecord, 'result' | 'at'>> & { actor?: AuditActor };
