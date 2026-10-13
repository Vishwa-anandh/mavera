import type { IdocRecord } from '../../../data-access';
import { isOpen, statusInfo, type IdocLifecycle } from './idocStatus';

export const lifecycleOf = (record: IdocRecord): IdocLifecycle => statusInfo(record.statusCode).lifecycle;

/** Minutes since the record was created (its age in the current status for open records). */
export function ageMinutes(record: IdocRecord, now = Date.now()): number {
  return Math.max(0, Math.round((now - new Date(record.createdAt).getTime()) / 60_000));
}

export function formatAge(minutes: number | null): string {
  if (minutes === null) return 'Unavailable';
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function hasPendingRetry(record: IdocRecord): boolean {
  return record.retries.some((retry) => retry.result === 'Pending');
}

export interface IdocKpis {
  total: number;
  inbound: number;
  outbound: number;
  completed: number;
  failed: number;
  open: number;
  retried: number;
  /** Completed ÷ (completed + failed); open records are excluded from the denominator. */
  successRate: number | null;
}

export function idocKpis(records: IdocRecord[]): IdocKpis {
  const count = (fn: (r: IdocRecord) => boolean) => records.filter(fn).length;
  const completed = count((r) => lifecycleOf(r) === 'Completed');
  const failed = count((r) => lifecycleOf(r) === 'Failed');
  return {
    total: records.length,
    inbound: count((r) => r.direction === 'Inbound'),
    outbound: count((r) => r.direction === 'Outbound'),
    completed,
    failed,
    open: count((r) => isOpen(lifecycleOf(r))),
    retried: count((r) => r.retries.length > 0),
    successRate: completed + failed > 0 ? Math.round((completed / (completed + failed)) * 1000) / 10 : null,
  };
}

export interface DailyPoint { date: string; total: number; completed: number; failed: number; inbound: number; outbound: number; failureRate: number | null }

/** One point per calendar day for the last `days` days, oldest first, with empty days kept. */
export function dailySeries(records: IdocRecord[], days = 14, now = Date.now()): DailyPoint[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return Array.from({ length: days }, (_, i) => {
    const from = new Date(start);
    from.setDate(start.getDate() + i);
    const to = new Date(from);
    to.setDate(from.getDate() + 1);
    const inDay = records.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= from.getTime() && t < to.getTime();
    });
    const completed = inDay.filter((r) => lifecycleOf(r) === 'Completed').length;
    const failed = inDay.filter((r) => lifecycleOf(r) === 'Failed').length;
    return {
      date: from.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      total: inDay.length,
      completed,
      failed,
      inbound: inDay.filter((r) => r.direction === 'Inbound').length,
      outbound: inDay.filter((r) => r.direction === 'Outbound').length,
      failureRate: completed + failed > 0 ? Math.round((failed / (completed + failed)) * 1000) / 10 : null,
    };
  });
}

export interface GroupStats {
  key: string;
  partner?: string;
  messageType?: string;
  direction?: IdocRecord['direction'];
  count: number;
  failed: number;
  completed: number;
  waiting: number;
  failureRate: number | null;
  oldestWaitingMinutes: number | null;
  lastActivity: string;
  /** Median processing time of completed records with a measured duration. */
  medianSeconds: number | null;
  durationSamples: number;
  records: IdocRecord[];
}

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export function groupStats(records: IdocRecord[], keyOf: (r: IdocRecord) => string, now = Date.now()): GroupStats[] {
  const groups = new Map<string, IdocRecord[]>();
  for (const record of records) {
    const key = keyOf(record);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups.entries()].map(([key, items]) => {
    const failed = items.filter((r) => lifecycleOf(r) === 'Failed').length;
    const completed = items.filter((r) => lifecycleOf(r) === 'Completed').length;
    const waiting = items.filter((r) => isOpen(lifecycleOf(r)));
    const durations = items.map((r) => r.durationSeconds).filter((d): d is number => d !== null);
    return {
      key,
      partner: items[0].partner,
      messageType: items[0].messageType,
      direction: items[0].direction,
      count: items.length,
      failed,
      completed,
      waiting: waiting.length,
      failureRate: failed + completed > 0 ? Math.round((failed / (failed + completed)) * 1000) / 10 : null,
      oldestWaitingMinutes: waiting.length ? Math.max(...waiting.map((r) => ageMinutes(r, now))) : null,
      lastActivity: items.map((r) => r.updatedAt).sort().at(-1) ?? items[0].updatedAt,
      medianSeconds: median(durations),
      durationSamples: durations.length,
      records: items,
    };
  });
}

/** Volume per port, split by whether the port sent or received. */
export function portVolumes(records: IdocRecord[]) {
  const ports = new Map<string, { port: string; sender: number; receiver: number }>();
  const bump = (port: string, field: 'sender' | 'receiver') => {
    const row = ports.get(port) ?? { port, sender: 0, receiver: 0 };
    row[field] += 1;
    ports.set(port, row);
  };
  for (const record of records) {
    bump(record.senderPort, 'sender');
    bump(record.receiverPort, 'receiver');
  }
  return [...ports.values()];
}
