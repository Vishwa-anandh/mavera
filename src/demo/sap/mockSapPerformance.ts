/** PROTOTYPE MOCK DATA — a single ABAP system's performance deep dive.
 * A metric the source system doesn't report is `null` (the GRC sample returned 0 for its
 * buffer hit ratio and memory, which means "not collected", not a real 0%). */
export const SAP_PERFORMANCE: {
  system: string; status: 'Connected'; lastFetched: string; nextSyncMinutes: number; responseTimeMs: number; activeUsers: number;
  dbHitRatioPercent: number | null; workProcessesUsed: number; workProcessesTotal: number; abapDumps: number; abortedJobs: number;
  memoryUsagePercent: number | null; systemLocks: number;
} = {
  system: 'ABAP',
  status: 'Connected',
  lastFetched: '15:37:05',
  nextSyncMinutes: 4,
  responseTimeMs: 53,
  activeUsers: 11,
  dbHitRatioPercent: null,
  workProcessesUsed: 2,
  workProcessesTotal: 20,
  abapDumps: 0,
  abortedJobs: 0,
  memoryUsagePercent: null,
  systemLocks: 0,
};

export interface ServerTopologyNode {
  id: string;
  host: string;
  loadPercent: number;
  status: 'Active' | 'Inactive';
  responseMs: number;
  users: number;
  quality: number;
  steps: number;
}

export const SAP_SERVER_TOPOLOGY: ServerTopologyNode[] = [
  { id: 'sapgrc_GRC_00', host: 'sapgrc:tick-port', loadPercent: 3, status: 'Active', responseMs: 53, users: 11, quality: 6, steps: 43 },
];

export interface DiskMount {
  path: string;
  usedMb: number;
  freeMb: number;
  totalMb: number;
  percent: number;
}

export const SAP_DISK_USAGE: DiskMount[] = [
  { path: '/', usedMb: 29.4, freeMb: 30.6, totalMb: 60.0, percent: 49 },
  { path: '/home', usedMb: 29.4, freeMb: 30.6, totalMb: 60.0, percent: 49 },
  { path: '/backup', usedMb: 467.9, freeMb: 31.9, totalMb: 499.8, percent: 94 },
  { path: '/hana/log', usedMb: 26.9, freeMb: 23.0, totalMb: 49.9, percent: 54 },
  { path: '/sapmnt', usedMb: 1.6, freeMb: 23.3, totalMb: 24.9, percent: 7 },
];

export interface BackgroundJob {
  name: string;
  status: 'Scheduled' | 'Running' | 'Finished' | 'Cancelled';
  startedAt: string;
  finishedAt: string | null;
  durationSec: number | null;
  user: string;
}

export const SAP_BACKGROUND_JOBS: BackgroundJob[] = [
  { name: 'SAP_COLLECTOR_FOR_PERFMONITOR', status: 'Finished', startedAt: '2026-09-29 02:00:04', finishedAt: '2026-09-29 02:00:41', durationSec: 37, user: 'DDIC' },
  { name: 'RSCOLL00', status: 'Finished', startedAt: '2026-09-29 01:00:00', finishedAt: '2026-09-29 01:00:22', durationSec: 22, user: 'DDIC' },
  { name: 'BTCTRNS1', status: 'Finished', startedAt: '2026-09-29 00:15:10', finishedAt: '2026-09-29 00:15:12', durationSec: 2, user: 'SAPSYS' },
  { name: 'ZBTCH_MONTHLY_CLOSE', status: 'Running', startedAt: '2026-09-29 15:30:00', finishedAt: null, durationSec: null, user: 'ANBARASU' },
  { name: 'RDDIMPDP', status: 'Scheduled', startedAt: '2026-09-29 16:00:00', finishedAt: null, durationSec: null, user: 'DDIC' },
];

export interface AbapRuntimeError {
  id: string;
  program: string;
  errorType: string;
  occurredAt: string;
  user: string;
}

/** Empty on purpose — MIO's own ST22 panel showed "No Runtime Errors" for
 * this system; a real integration would populate this from ST22. */
export const SAP_ABAP_RUNTIME_ERRORS: AbapRuntimeError[] = [];
