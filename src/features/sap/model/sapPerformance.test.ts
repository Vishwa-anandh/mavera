import { describe, it, expect } from 'vitest';
import type { SapJob, SapWorkProcess } from '../../../data-access';
import { filterJobs, jobDurationSeries, jobDurationStats, jobStatusCounts, processMix, sortJobsNewestFirst, trendStats } from './sapPerformance';

const job = (name: string, status: SapJob['status'], startedAt: string, durationSec: number | null = 4, user = 'DDIC', client = '200'): SapJob => ({
  name, status, startedAt, finishedAt: null, durationSec, user, client,
});

const jobs = [
  job('A_FINANCE', 'Finished', '2026-10-16 10:00:00', 4),
  job('B_CLOSE', 'Running', '2026-10-16 11:00:00', null, 'ANBARASU', '100'),
  job('C_IMPORT', 'Cancelled', '2026-10-16 09:00:00', 8),
  job('D_LATER', 'Scheduled', '2026-10-16 16:00:00', null),
];

describe('jobs', () => {
  it('counts every status chip, calling a cancelled job Aborted', () => {
    expect(jobStatusCounts(jobs)).toEqual({ All: 4, Running: 1, Finished: 1, Aborted: 1, Scheduled: 1 });
  });

  it('filters by chip and by search over name, user, client and status', () => {
    expect(filterJobs(jobs, 'All', '').length).toBe(4);
    expect(filterJobs(jobs, 'Aborted', '').map((j) => j.name)).toEqual(['C_IMPORT']);
    expect(filterJobs(jobs, 'All', 'anbar').map((j) => j.name)).toEqual(['B_CLOSE']);
    expect(filterJobs(jobs, 'All', '100').map((j) => j.name)).toEqual(['B_CLOSE']);
    expect(filterJobs(jobs, 'All', 'aborted').map((j) => j.name)).toEqual(['C_IMPORT']);
    expect(filterJobs(jobs, 'Running', 'finance')).toEqual([]);
    expect(filterJobs(jobs, 'All', '  ').length).toBe(4);
  });

  it('sorts newest first without changing the input', () => {
    expect(sortJobsNewestFirst(jobs).map((j) => j.name)).toEqual(['D_LATER', 'B_CLOSE', 'A_FINANCE', 'C_IMPORT']);
    expect(jobs[0].name).toBe('A_FINANCE');
  });

  it('measures duration over runs that have one', () => {
    expect(jobDurationStats(jobs)).toEqual({ avgSec: 6, maxSec: 8, total: 4, finished: 2 });
    expect(jobDurationStats([])).toEqual({ avgSec: 0, maxSec: 0, total: 0, finished: 0 });
    expect(jobDurationSeries(jobs)).toEqual([{ time: '09:00', value: 8 }, { time: '10:00', value: 4 }]);
  });
});

describe('work processes and trends', () => {
  const wp = (no: number, type: SapWorkProcess['type']): SapWorkProcess => ({ no, type, pid: no, status: 'Waiting', restart: true, report: null, user: null });
  it('mixes by type, leaving out types that do not exist', () => {
    expect(processMix([wp(0, 'DIA'), wp(1, 'DIA'), wp(2, 'BTC')])).toEqual([{ type: 'DIA', count: 2 }, { type: 'BTC', count: 1 }]);
  });
  it('summarises a trend, and an empty one', () => {
    expect(trendStats([{ time: 'a', value: 2 }, { time: 'b', value: 6 }])).toEqual({ min: 2, max: 6, avg: 4, last: 6 });
    expect(trendStats([])).toEqual({ min: 0, max: 0, avg: 0, last: 0 });
  });
});
