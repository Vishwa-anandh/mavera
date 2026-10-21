import { describe, it, expect } from 'vitest';
import { sapRepository, type SapJob, type SapLock, type SapWorkProcess } from '../../../data-access';
import {
  filterJobs, formatLockAge, formatMegabytes, jobDurationSeries, jobDurationStats, jobStatusCounts, lockSummary, longestHeldLocks, memoryPoolRows,
  memoryStats, poolTone, processMix, sortJobsNewestFirst, trendStats,
} from './sapPerformance';

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

describe('memory pools and memory stats', () => {
  const pools = [
    { pool: 'Extended Memory', sizeMb: 16384, usedMb: 9830, peakMb: 12288 },
    { pool: 'Heap Memory', sizeMb: 4096, usedMb: 3350, peakMb: 3890 },
    { pool: 'Roll Area', sizeMb: 512, usedMb: 480, peakMb: 500 },
    { pool: 'Empty', sizeMb: 0, usedMb: 0, peakMb: 0 },
  ];
  it('derives free, whole-percent use and a status from size and use', () => {
    const rows = memoryPoolRows(pools);
    expect(rows[0]).toMatchObject({ freeMb: 6554, usedPercent: 60, tone: 'success', status: 'Healthy' });
    expect(rows[1]).toMatchObject({ freeMb: 746, usedPercent: 82, tone: 'warning', status: 'Warning' });
    expect(rows[2]).toMatchObject({ usedPercent: 94, tone: 'danger', status: 'Critical' });
    expect(rows[3]).toMatchObject({ usedPercent: 0, freeMb: 0, status: 'Healthy' });
  });
  it('puts the thresholds at 75 and 90 percent', () => {
    expect([poolTone(74), poolTone(75), poolTone(89), poolTone(90)]).toEqual(['success', 'warning', 'warning', 'danger']);
  });
  it('formats sizes in MB below a gigabyte and GB above', () => {
    expect([formatMegabytes(512), formatMegabytes(1024), formatMegabytes(16384)]).toEqual(['512 MB', '1.0 GB', '16.0 GB']);
  });
  it('reads now, percent and peak from the series, and reports no percent without one', () => {
    const series = [{ time: '14:00', usedGb: 10, allocatedGb: 20 }, { time: '15:00', usedGb: 13, allocatedGb: 20 }, { time: '16:00', usedGb: 9, allocatedGb: 20 }];
    expect(memoryStats(series)).toEqual({ usedGb: 9, allocatedGb: 20, percent: 45, peakGb: 13 });
    expect(memoryStats([])).toEqual({ usedGb: 0, allocatedGb: 0, percent: null, peakGb: 0 });
    expect(memoryStats([{ time: 'x', usedGb: 1, allocatedGb: 0 }]).percent).toBeNull();
  });
});

describe('system locks', () => {
  const lock = (id: string, table: string, ageSec: number): SapLock => ({ id, table, mode: 'E', user: 'U', ageSec });
  it('formats lock age in seconds, minutes and hours', () => {
    expect([formatLockAge(38), formatLockAge(60), formatLockAge(402), formatLockAge(3600), formatLockAge(4320)]).toEqual(['38 s', '1 min', '6 min', '1 h', '1 h 12 min']);
  });
  it('counts the entries and finds the oldest, with none for an empty list', () => {
    expect(lockSummary([lock('a', 'BKPF', 40), lock('b', 'BSEG', 400)])).toEqual({ count: 2, oldestAgeSec: 400 });
    expect(lockSummary([])).toEqual({ count: 0, oldestAgeSec: null });
  });
  it('lists the longest-held first, breaks ties by table, limits and does not mutate', () => {
    const locks = [lock('a', 'ZB', 10), lock('b', 'ZA', 10), lock('c', 'MARA', 99), lock('d', 'KNA1', 5)];
    expect(longestHeldLocks(locks, 3).map((l) => l.table)).toEqual(['MARA', 'ZA', 'ZB']);
    expect(locks[0].table).toBe('ZB');
  });
});

describe('the sample data agrees with itself', () => {
  it('has a 24 hour series whose latest point is the pools total, and a KPI that matches it', () => {
    const series = sapRepository.getMemorySeries();
    const rows = memoryPoolRows(sapRepository.listMemoryPools());
    expect(series).toHaveLength(24);
    const allocatedGb = rows.reduce((sum, r) => sum + r.sizeMb, 0) / 1024;
    const usedGb = rows.reduce((sum, r) => sum + r.usedMb, 0) / 1024;
    expect(series[23].allocatedGb).toBeCloseTo(allocatedGb, 1);
    expect(series[23].usedGb).toBeCloseTo(usedGb, 1);
    expect(sapRepository.getPerformance().memoryUsagePercent).toBe(memoryStats(series).percent);
    expect(sapRepository.getPerformance().systemLocks).toBe(sapRepository.listSystemLocks().length);
  });
});
