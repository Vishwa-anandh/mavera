export type SapCondition = 'healthy' | 'warning' | 'critical';

export interface SapSystem {
  id: string;
  name: string;
  environment: string;
  condition: SapCondition;
  cpuPercent: number;
  memoryPercent: number;
  lastCollection: string;
}

export interface HanaSystem {
  name: string;
  type: string;
  host: string;
  version: string;
  lastFetched: string;
  nextSyncMinutes: number;
  memory: { usedGb: number; totalGb: number; freeGb: number; percent: number; condition: 'healthy' | 'warning' | 'critical' };
  cpu: { loadPercent: number; swapUsedGb: number; services: number; peak24h: number; condition: 'stable' | 'warning' | 'critical' };
  alerts: { active: number; highPriority: number; critical: number; high: number; medium: number; low: number };
  sessions: { active: number; uniqueUsers: number; byUser: HanaSessionUser[] };
}

export interface HanaSessionUser {
  user: string;
  sessions: number;
}

export interface HanaVitalPoint {
  time: string;
  cpuPercent: number;
  memoryPercent: number;
}

export interface HanaService {
  name: string;
  status: 'running' | 'stopped';
  /** Heap memory in use (MB). */
  memoryMb: number;
  /** Memory the service has reserved from the host (MB); never below `memoryMb` for a running service. */
  allocatedMb: number;
  /** Shared memory the service maps (MB). */
  sharedMb: number;
}

export interface SapJob {
  name: string;
  status: 'Scheduled' | 'Running' | 'Finished' | 'Cancelled';
  startedAt: string;
  finishedAt: string | null;
  durationSec: number | null;
  user: string;
  /** SAP client the job ran in. */
  client: string;
}

export interface SapDump {
  id: string;
  program: string;
  errorType: string;
  occurredAt: string;
  user: string;
}

export interface SapAlertRecord {
  id: string;
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  system: string;
  message: string;
  detectedAt: string;
  read: boolean;
}

export interface SapSecurityNoteSummary {
  total: number;
  actionable: number;
  hotNews: number;
}

export interface SapPerformanceSnapshot {
  system: string;
  status: string;
  lastFetched: string;
  nextSyncMinutes: number;
  responseTimeMs: number;
  activeUsers: number;
  workProcessesUsed: number;
  workProcessesTotal: number;
  abapDumps: number;
  abortedJobs: number;
  systemLocks: number;
  dbHitRatioPercent: number | null;
  memoryUsagePercent: number | null;
}

export interface SapDiskMount {
  path: string;
  usedGb: number;
  freeGb: number;
  totalGb: number;
  percent: number;
}

/* ---- HANA deep dive: disk partitions and backups (HANA Monitoring) ---- */

export type HanaPartitionUsage = 'DATA' | 'DATA_BACKUP' | 'LOG' | 'LOG_BACKUP+CATALOG_BACKUP' | 'TRACE';

export interface HanaDiskPartition {
  usage: HanaPartitionUsage;
  usedGb: number;
  freeGb: number;
  totalGb: number;
  host: string;
  path: string;
  mount: string;
  device: string;
}

export type HanaBackupKind = 'Data backup' | 'Log backup' | 'Catalog backup';
export type HanaBackupStatus = 'success' | 'warning' | 'failed';

export interface HanaBackupEntry {
  id: string;
  kind: HanaBackupKind;
  status: HanaBackupStatus;
  /** Local start time, `YYYY-MM-DD HH:mm:ss`. */
  startedAt: string;
  durationSec: number;
  sizeGb: number;
  /** Why a backup did not complete cleanly. */
  message?: string;
}

/* ---- ABAP performance deep dive (SAP Performance) ---- */

export interface SapServerNode {
  id: string;
  host: string;
  loadPercent: number;
  status: 'Active' | 'Inactive';
  responseMs: number;
  users: number;
  quality: number;
  steps: number;
}

export type SapWorkProcessType = 'DIA' | 'BTC' | 'UPD' | 'ENQ' | 'SPO';

export interface SapWorkProcess {
  no: number;
  type: SapWorkProcessType;
  pid: number;
  status: 'Running' | 'Waiting' | 'Stopped';
  restart: boolean;
  report: string | null;
  user: string | null;
}

export interface SapBufferStat {
  buffer: string;
  hitRatioPercent: number;
  calls: number;
  swaps: number;
}

export interface SapDbCallStatistics {
  bufferHitRatioPercent: number;
  totalCalls: number;
  avgCallMs: number;
  buffers: SapBufferStat[];
}

export interface SapTrendPoint {
  /** Axis label, e.g. an hour. */
  time: string;
  value: number;
}

export interface SapPerformanceTrends {
  /** SAP buffer hit ratio (ST02), percent, hourly over the last day. */
  bufferHit: SapTrendPoint[];
  /** Database calls, hourly over the last day. */
  dbCalls: SapTrendPoint[];
  /** ABAP short dumps per day over the last seven days (today last). */
  dumps: SapTrendPoint[];
}

export interface SapQueueIndicator {
  /** Work processes of this type that exist. */
  workers: number;
  busy: number;
  /** Requests waiting for a free worker or lock. */
  queued: number;
}

export interface SapQueues {
  upd: SapQueueIndicator;
  enq: SapQueueIndicator;
}
