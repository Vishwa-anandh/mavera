import { describe, it, expect } from 'vitest';
import type { HanaBackupEntry, HanaDiskPartition, HanaService } from '../../../data-access';
import {
  backupInsights, backupsInWindow, diskTone, formatBackupStamp, formatDuration, lastSuccessfulBackup, orderServices,
  partitionPercent, serviceMemoryRows, serviceMemorySummary, summariseBackups, summariseDisks,
} from './hanaDetail';

const svc = (name: string, status: 'running' | 'stopped', memoryMb: number, allocatedMb = memoryMb * 2, sharedMb = 1024): HanaService => ({ name, status, memoryMb, allocatedMb, sharedMb });

describe('services', () => {
  const services = [svc('a', 'running', 100), svc('b', 'stopped', 0, 0, 0), svc('c', 'running', 500)];

  it('puts stopped services first, then the biggest', () => {
    expect(orderServices(services).map((s) => s.name)).toEqual(['b', 'c', 'a']);
  });

  it('ranks the chart rows by heap and converts to GB', () => {
    const rows = serviceMemoryRows(services);
    expect(rows.map((r) => r.name)).toEqual(['c', 'a', 'b']);
    expect(rows[0]).toMatchObject({ heapUsedGb: 0.49, allocatedGb: 0.98, sharedGb: 1 });
  });

  it('totals heap, allocated and shared in GB', () => {
    expect(serviceMemorySummary([svc('a', 'running', 2048, 4096, 1024), svc('b', 'running', 1024, 2048, 512)])).toEqual({ heapUsedGb: 3, allocatedGb: 6, sharedGb: 1.5 });
  });
});

describe('disks', () => {
  const part = (usage: HanaDiskPartition['usage'], device: string, usedGb: number, totalGb: number): HanaDiskPartition => ({
    usage, usedGb, freeGb: totalGb - usedGb, totalGb, host: 'h', path: `/${usage}`, mount: '/m', device,
  });

  it('counts a shared device once in the overall figures', () => {
    const summary = summariseDisks([part('DATA', '/dev/a', 100, 200), part('TRACE', '/dev/b', 50, 100), part('LOG', '/dev/b', 50, 100)]);
    expect(summary).toMatchObject({ partitions: 3, devices: 2, usedGb: 150, totalGb: 300, freeGb: 150, percent: 50, tone: 'success' });
    expect(summary.shared).toEqual([{ device: '/dev/b', mount: '/m', usages: ['TRACE', 'LOG'] }]);
  });

  it('is calm and does not divide by zero with no partitions', () => {
    expect(summariseDisks([])).toMatchObject({ partitions: 0, percent: 0, totalGb: 0 });
    expect(partitionPercent({ usedGb: 0, totalGb: 0 })).toBe(0);
  });

  it('tones by threshold', () => {
    expect([diskTone(40), diskTone(75), diskTone(90)]).toEqual(['success', 'warning', 'danger']);
  });
});

describe('backups', () => {
  const b = (id: string, startedAt: string, status: HanaBackupEntry['status'] = 'success', kind: HanaBackupEntry['kind'] = 'Data backup', durationSec = 60): HanaBackupEntry => ({
    id, kind, status, startedAt, durationSec, sizeGb: 10, ...(status !== 'success' ? { message: 'why' } : {}),
  });
  const list = [
    b('1', '2026-10-02 01:30:00'),
    b('2', '2026-10-09 01:30:00', 'failed', 'Log backup'),
    b('3', '2026-10-15 01:30:00', 'warning'),
    b('4', '2026-10-16 01:30:00'),
  ];

  it('formats durations and stamps', () => {
    expect([formatDuration(4), formatDuration(60), formatDuration(432), formatDuration(1140)]).toEqual(['4s', '1m', '7m 12s', '19m']);
    expect(formatBackupStamp('2026-10-16 01:30:12')).toBe('16 Oct 01:30');
  });

  it('windows back from the day of the newest backup', () => {
    expect(backupsInWindow(list, 7).map((x) => x.id)).toEqual(['3', '4']);
    expect(backupsInWindow(list, 14).map((x) => x.id)).toEqual(['2', '3', '4']);
    expect(backupsInWindow([], 7)).toEqual([]);
  });

  it('summarises counts and rate', () => {
    const s = summariseBackups(list);
    expect(s).toMatchObject({ total: 4, success: 2, warning: 1, failed: 1, successRatePercent: 50 });
  });

  it('finds the newest clean backup of a kind, ignoring warnings', () => {
    expect(lastSuccessfulBackup(list)?.id).toBe('4');
    expect(lastSuccessfulBackup(list.slice(0, 3))?.id).toBe('1');
    expect(lastSuccessfulBackup(list, 'Catalog backup')).toBeUndefined();
  });

  it('leads with the last successful backup, then problems newest first', () => {
    const out = backupInsights(list);
    expect(out[0]).toMatchObject({ id: 'last-success', tone: 'success' });
    expect(out[0].title).toContain('16 Oct 01:30');
    expect(out.slice(1).map((i) => i.tone)).toEqual(['warning', 'danger']);
  });

  it('says so when there is no successful data backup', () => {
    expect(backupInsights([b('x', '2026-10-16 01:30:00', 'failed')])[0]).toMatchObject({ tone: 'danger', title: 'No successful data backup in this window' });
  });
});
