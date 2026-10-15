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
  sessions: { active: number; uniqueUsers: number };
}

export interface HanaVitalPoint {
  time: string;
  cpuPercent: number;
  memoryPercent: number;
}

export interface HanaService {
  name: string;
  status: 'running' | 'stopped';
  memoryMb: number;
}

export interface SapJob {
  name: string;
  status: 'Scheduled' | 'Running' | 'Finished' | 'Cancelled';
  startedAt: string;
  finishedAt: string | null;
  durationSec: number | null;
  user: string;
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
  usedMb: number;
  freeMb: number;
  totalMb: number;
  percent: number;
}
