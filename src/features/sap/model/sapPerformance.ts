import type { SapJob, SapLock, SapLockMode, SapMemoryPoint, SapMemoryPool, SapTrendPoint, SapWorkProcess, SapWorkProcessType } from '../../../data-access';

export type JobFilter = 'All' | 'Running' | 'Finished' | 'Aborted' | 'Scheduled';
export const JOB_FILTERS: JobFilter[] = ['All', 'Running', 'Finished', 'Aborted', 'Scheduled'];

/** SM37 calls a cancelled job "Aborted"; the stored value stays "Cancelled". */
export const JOB_STATUS_LABEL: Record<SapJob['status'], string> = {
  Scheduled: 'Scheduled',
  Running: 'Running',
  Finished: 'Finished',
  Cancelled: 'Aborted',
};

export const JOB_STATUS_TONE: Record<SapJob['status'], string> = {
  Scheduled: 'neutral',
  Running: 'info',
  Finished: 'success',
  Cancelled: 'danger',
};

export function jobStatusCounts(jobs: SapJob[]): Record<JobFilter, number> {
  const count = (status: SapJob['status']) => jobs.filter((j) => j.status === status).length;
  return { All: jobs.length, Running: count('Running'), Finished: count('Finished'), Aborted: count('Cancelled'), Scheduled: count('Scheduled') };
}

/** Newest start first. The stored `startedAt` is `YYYY-MM-DD HH:mm:ss`, which sorts as text. */
export function sortJobsNewestFirst(jobs: SapJob[]): SapJob[] {
  return [...jobs].sort((a, b) => b.startedAt.localeCompare(a.startedAt) || a.name.localeCompare(b.name));
}

/** Filters by status chip and by a search over name, user, client and status. A blank search matches everything. */
export function filterJobs(jobs: SapJob[], filter: JobFilter, query: string): SapJob[] {
  const q = query.trim().toLowerCase();
  return jobs.filter((job) => {
    if (filter !== 'All' && JOB_STATUS_LABEL[job.status] !== filter) return false;
    if (!q) return true;
    return [job.name, job.user, job.client, JOB_STATUS_LABEL[job.status]].some((field) => field.toLowerCase().includes(q));
  });
}

export const JOBS_PAGE_SIZE = 15;

export interface JobDurationStats {
  avgSec: number;
  maxSec: number;
  total: number;
  finished: number;
}

export function jobDurationStats(jobs: SapJob[]): JobDurationStats {
  const durations = jobs.map((j) => j.durationSec).filter((d): d is number => d !== null);
  return {
    avgSec: durations.length === 0 ? 0 : Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    maxSec: durations.length === 0 ? 0 : Math.max(...durations),
    total: jobs.length,
    finished: durations.length,
  };
}

/** Finished runs, oldest to newest, for the Job Duration chart. */
export function jobDurationSeries(jobs: SapJob[]): SapTrendPoint[] {
  return [...jobs]
    .filter((j) => j.durationSec !== null)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((j) => ({ time: j.startedAt.slice(11, 16), value: j.durationSec as number }));
}

export const WORK_PROCESS_TYPES: SapWorkProcessType[] = ['DIA', 'BTC', 'UPD', 'ENQ', 'SPO'];
export const WORK_PROCESS_LABEL: Record<SapWorkProcessType, string> = {
  DIA: 'Dialog',
  BTC: 'Background',
  UPD: 'Update',
  ENQ: 'Enqueue',
  SPO: 'Spool',
};

export function processMix(processes: SapWorkProcess[]): Array<{ type: SapWorkProcessType; count: number }> {
  return WORK_PROCESS_TYPES.map((type) => ({ type, count: processes.filter((p) => p.type === type).length })).filter((row) => row.count > 0);
}

export function processStatusCounts(processes: SapWorkProcess[]): Record<SapWorkProcess['status'], number> {
  return {
    Running: processes.filter((p) => p.status === 'Running').length,
    Waiting: processes.filter((p) => p.status === 'Waiting').length,
    Stopped: processes.filter((p) => p.status === 'Stopped').length,
  };
}

export function trendStats(points: SapTrendPoint[]): { min: number; max: number; avg: number; last: number } {
  if (points.length === 0) return { min: 0, max: 0, avg: 0, last: 0 };
  const values = points.map((p) => p.value);
  return { min: Math.min(...values), max: Math.max(...values), avg: values.reduce((a, b) => a + b, 0) / values.length, last: values[values.length - 1] };
}

/* ---- Memory pools (ST02) and the application-server memory chart ---- */

export type PoolTone = 'success' | 'warning' | 'danger';

export interface MemoryPoolRow {
  pool: string;
  sizeMb: number;
  usedMb: number;
  peakMb: number;
  freeMb: number;
  /** Whole percent of the configured size in use. */
  usedPercent: number;
  tone: PoolTone;
  status: 'Healthy' | 'Warning' | 'Critical';
}

/** 75 percent and up is a warning, 90 percent and up is critical; a pool of size 0 reports 0 percent. */
export function poolTone(percent: number): PoolTone {
  return percent >= 90 ? 'danger' : percent >= 75 ? 'warning' : 'success';
}

const POOL_STATUS: Record<PoolTone, MemoryPoolRow['status']> = { success: 'Healthy', warning: 'Warning', danger: 'Critical' };

export function memoryPoolRows(pools: SapMemoryPool[]): MemoryPoolRow[] {
  return pools.map((p) => {
    const usedPercent = p.sizeMb > 0 ? Math.round((p.usedMb / p.sizeMb) * 100) : 0;
    const tone = poolTone(usedPercent);
    return { ...p, freeMb: Math.max(0, p.sizeMb - p.usedMb), usedPercent, tone, status: POOL_STATUS[tone] };
  });
}

/** "512 MB", "16.0 GB". */
export function formatMegabytes(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

export interface MemoryStats {
  usedGb: number;
  allocatedGb: number;
  /** Whole percent of the allocation in use now; null when there is no series or nothing allocated (not a real 0%). */
  percent: number | null;
  peakGb: number;
}

/** The latest point is "now"; the peak is the highest used value in the window. */
export function memoryStats(series: SapMemoryPoint[]): MemoryStats {
  const last = series[series.length - 1];
  if (!last) return { usedGb: 0, allocatedGb: 0, percent: null, peakGb: 0 };
  return {
    usedGb: last.usedGb,
    allocatedGb: last.allocatedGb,
    percent: last.allocatedGb > 0 ? Math.round((last.usedGb / last.allocatedGb) * 100) : null,
    peakGb: Math.max(...series.map((p) => p.usedGb)),
  };
}

/* ---- System locks (SM12) ---- */

export const LOCK_MODE_LABEL: Record<SapLockMode, string> = {
  E: 'Exclusive',
  S: 'Shared',
  X: 'Exclusive, not cumulative',
  O: 'Optimistic',
};

/** "38 s", "6 min", "1 h 12 min". */
export function formatLockAge(sec: number): string {
  if (sec < 60) return `${Math.max(0, Math.round(sec))} s`;
  const minutes = Math.floor(sec / 60);
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 60)} h ${rest} min`;
}

export function lockSummary(locks: SapLock[]): { count: number; oldestAgeSec: number | null } {
  return { count: locks.length, oldestAgeSec: locks.length === 0 ? null : Math.max(...locks.map((l) => l.ageSec)) };
}

/** Longest-held first; ties keep table-name order so the list is stable. */
export function longestHeldLocks(locks: SapLock[], limit = 5): SapLock[] {
  return [...locks].sort((a, b) => b.ageSec - a.ageSec || a.table.localeCompare(b.table)).slice(0, limit);
}
