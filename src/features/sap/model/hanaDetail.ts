import type { HanaBackupEntry, HanaBackupKind, HanaDiskPartition, HanaService } from '../../../data-access';

const MB_PER_GB = 1024;
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Stopped services first so they are hard to miss, then by memory, largest first. */
export function orderServices(services: HanaService[]): HanaService[] {
  return [...services].sort((a, b) => Number(b.status === 'stopped') - Number(a.status === 'stopped') || b.memoryMb - a.memoryMb);
}

export interface ServiceMemoryRow {
  name: string;
  status: HanaService['status'];
  heapUsedGb: number;
  allocatedGb: number;
  sharedGb: number;
}

/** Per-service memory in GB, largest heap first, for the Chart view. */
export function serviceMemoryRows(services: HanaService[]): ServiceMemoryRow[] {
  return [...services]
    .sort((a, b) => b.memoryMb - a.memoryMb || a.name.localeCompare(b.name))
    .map((s) => ({
      name: s.name,
      status: s.status,
      heapUsedGb: round2(s.memoryMb / MB_PER_GB),
      allocatedGb: round2(s.allocatedMb / MB_PER_GB),
      sharedGb: round2(s.sharedMb / MB_PER_GB),
    }));
}

export interface ServiceMemorySummary {
  heapUsedGb: number;
  allocatedGb: number;
  sharedGb: number;
}

export function serviceMemorySummary(services: HanaService[]): ServiceMemorySummary {
  const total = (pick: (s: HanaService) => number) => round1(services.reduce((sum, s) => sum + pick(s), 0) / MB_PER_GB);
  return { heapUsedGb: total((s) => s.memoryMb), allocatedGb: total((s) => s.allocatedMb), sharedGb: total((s) => s.sharedMb) };
}

export type DiskTone = 'success' | 'warning' | 'danger';
export const DISK_WARNING_PERCENT = 75;
export const DISK_CRITICAL_PERCENT = 90;

export function diskTone(percent: number): DiskTone {
  return percent >= DISK_CRITICAL_PERCENT ? 'danger' : percent >= DISK_WARNING_PERCENT ? 'warning' : 'success';
}

export function partitionPercent(p: Pick<HanaDiskPartition, 'usedGb' | 'totalGb'>): number {
  return p.totalGb > 0 ? Math.round((p.usedGb / p.totalGb) * 100) : 0;
}

export interface DiskSummary {
  partitions: number;
  /** Distinct devices; several partitions can share one filesystem. */
  devices: number;
  usedGb: number;
  freeGb: number;
  totalGb: number;
  percent: number;
  tone: DiskTone;
  /** Devices carrying more than one partition. */
  shared: Array<{ device: string; mount: string; usages: string[] }>;
}

/**
 * Overall capacity counts each device once: DATA_BACKUP, LOG_BACKUP and TRACE all live on the same
 * /hana/shared volume, so adding their rows up would count that disk three times.
 */
export function summariseDisks(partitions: HanaDiskPartition[]): DiskSummary {
  const byDevice = new Map<string, HanaDiskPartition[]>();
  for (const p of partitions) byDevice.set(p.device, [...(byDevice.get(p.device) ?? []), p]);
  let used = 0;
  let total = 0;
  const shared: DiskSummary['shared'] = [];
  for (const [device, group] of byDevice) {
    used += group[0].usedGb;
    total += group[0].totalGb;
    if (group.length > 1) shared.push({ device, mount: group[0].mount, usages: group.map((g) => g.usage) });
  }
  const percent = total > 0 ? Math.round((used / total) * 100) : 0;
  return { partitions: partitions.length, devices: byDevice.size, usedGb: round1(used), freeGb: round1(round1(total) - round1(used)), totalGb: round1(total), percent, tone: diskTone(percent), shared };
}

/** "7m 12s", "4s", "19m". */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-10-16 01:30:12` -> milliseconds, read as a wall-clock time (no zone), so labels never shift. */
export function stampMs(stamp: string): number {
  const [date, time = '00:00:00'] = stamp.split(' ');
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi, s = 0] = time.split(':').map(Number);
  return Date.UTC(y, mo - 1, d, h, mi, s);
}

/** `2026-10-16 01:30:12` -> "16 Oct 01:30". */
export function formatBackupStamp(stamp: string): string {
  const [date, time = ''] = stamp.split(' ');
  const [, mo, d] = date.split('-').map(Number);
  return `${d} ${MONTHS[mo - 1]} ${time.slice(0, 5)}`;
}

export const BACKUP_KINDS: HanaBackupKind[] = ['Data backup', 'Log backup', 'Catalog backup'];

const DAY_MS = 86_400_000;

/** Backups from the last `days` calendar days, counted back from the day of the newest backup. Input order is kept. */
export function backupsInWindow(backups: HanaBackupEntry[], days: number): HanaBackupEntry[] {
  if (backups.length === 0) return [];
  const newest = Math.max(...backups.map((b) => stampMs(b.startedAt)));
  const endOfDay = Math.floor(newest / DAY_MS) * DAY_MS + DAY_MS;
  const from = endOfDay - days * DAY_MS;
  return backups.filter((b) => stampMs(b.startedAt) >= from);
}

export interface BackupSummary {
  total: number;
  success: number;
  warning: number;
  failed: number;
  /** Share of backups that completed without a warning or failure. */
  successRatePercent: number;
  avgDurationSec: number;
}

export function summariseBackups(backups: HanaBackupEntry[]): BackupSummary {
  const count = (status: HanaBackupEntry['status']) => backups.filter((b) => b.status === status).length;
  const completed = backups.filter((b) => b.status !== 'failed');
  return {
    total: backups.length,
    success: count('success'),
    warning: count('warning'),
    failed: count('failed'),
    successRatePercent: backups.length === 0 ? 0 : Math.round((count('success') / backups.length) * 100),
    avgDurationSec: completed.length === 0 ? 0 : Math.round(completed.reduce((sum, b) => sum + b.durationSec, 0) / completed.length),
  };
}

/** The newest backup of a kind that finished with status "success" (a warning is not a clean recovery point). */
export function lastSuccessfulBackup(backups: HanaBackupEntry[], kind: HanaBackupKind = 'Data backup'): HanaBackupEntry | undefined {
  return backups
    .filter((b) => b.kind === kind && b.status === 'success')
    .sort((a, b) => stampMs(b.startedAt) - stampMs(a.startedAt))[0];
}

export interface BackupInsight {
  id: string;
  tone: 'success' | 'warning' | 'danger';
  title: string;
  detail?: string;
}

/** The "last successful backup" line first, then anything that did not complete cleanly, newest first. */
export function backupInsights(backups: HanaBackupEntry[]): BackupInsight[] {
  const out: BackupInsight[] = [];
  const last = lastSuccessfulBackup(backups);
  if (last) {
    out.push({
      id: 'last-success',
      tone: 'success',
      title: `Last successful data backup: ${formatBackupStamp(last.startedAt)}`,
      detail: `${formatDuration(last.durationSec)} · ${last.sizeGb.toFixed(1)} GB.`,
    });
  } else {
    out.push({ id: 'last-success', tone: 'danger', title: 'No successful data backup in this window', detail: 'Check the backup schedule and the backup target.' });
  }
  const problems = backups.filter((b) => b.status !== 'success').sort((a, b) => stampMs(b.startedAt) - stampMs(a.startedAt));
  for (const b of problems) {
    out.push({
      id: `problem-${b.id}`,
      tone: b.status === 'failed' ? 'danger' : 'warning',
      title: `${b.kind} ${b.status === 'failed' ? 'failed' : 'completed with a warning'} on ${formatBackupStamp(b.startedAt)}`,
      detail: b.message,
    });
  }
  return out;
}
