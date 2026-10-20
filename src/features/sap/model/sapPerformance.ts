import type { SapJob, SapTrendPoint, SapWorkProcess, SapWorkProcessType } from '../../../data-access';

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
