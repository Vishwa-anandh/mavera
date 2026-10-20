import type { AuditEventRecord } from '../../../data-access';

export type ActorFilter = 'all' | 'admin' | 'member';

export interface AuditFilters {
  actor: ActorFilter;
  /** An exact module label, or 'all'. */
  module: string;
  /** Inclusive local dates as "YYYY-MM-DD"; empty means unbounded. */
  from: string;
  to: string;
  query: string;
}

export const NO_FILTERS: AuditFilters = { actor: 'all', module: 'all', from: '', to: '', query: '' };

export function hasActiveFilters(filters: AuditFilters): boolean {
  return filters.actor !== 'all' || filters.module !== 'all' || Boolean(filters.from) || Boolean(filters.to) || Boolean(filters.query.trim());
}

/** "YYYY-MM-DD" in the viewer's own time zone, which is how the date pickers and the day groups agree. */
export function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const searchable = (event: AuditEventRecord) =>
  [event.actorName, event.actorEmail, event.actorRole, event.action, event.target, event.module, event.detail, event.source, event.result]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export function filterEvents(events: readonly AuditEventRecord[], filters: AuditFilters): AuditEventRecord[] {
  const words = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
  return events.filter((event) => {
    if (filters.actor !== 'all' && event.actorKind !== filters.actor) return false;
    if (filters.module !== 'all' && event.module !== filters.module) return false;
    const day = localDateKey(new Date(event.at));
    if (filters.from && day < filters.from) return false;
    if (filters.to && day > filters.to) return false;
    if (words.length > 0) {
      const text = searchable(event);
      if (!words.every((word) => text.includes(word))) return false;
    }
    return true;
  });
}

/** The distinct modules in the feed, alphabetical. */
export function auditModules(events: readonly AuditEventRecord[]): string[] {
  return [...new Set(events.map((event) => event.module))].sort((a, b) => a.localeCompare(b));
}

export interface DayGroup {
  /** "YYYY-MM-DD". */
  key: string;
  label: string;
  events: AuditEventRecord[];
}

/** "Today", "Yesterday", or "Mon 13 Oct". */
export function dayLabel(key: string, now: Date = new Date()): string {
  if (key === localDateKey(now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key === localDateKey(yesterday)) return 'Yesterday';
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Groups already-sorted (newest first) events by local calendar day, keeping order. */
export function groupByDay(events: readonly AuditEventRecord[], now: Date = new Date()): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const event of events) {
    const key = localDateKey(new Date(event.at));
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.events.push(event);
    else groups.push({ key, label: dayLabel(key, now), events: [event] });
  }
  return groups;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const RESULT_LABELS: Record<AuditEventRecord['result'], string> = { success: 'Success', failure: 'Failed', denied: 'Denied' };
export const RESULT_TONES: Record<AuditEventRecord['result'], 'success' | 'danger' | 'warning'> = { success: 'success', failure: 'danger', denied: 'warning' };

export const CSV_HEADER = ['Time (UTC)', 'Actor', 'Email', 'Actor type', 'Role', 'Action', 'Target', 'Module', 'Result', 'Source', 'Detail', 'Changes', 'Event ID'];

export function eventsToCsvRows(events: readonly AuditEventRecord[]): string[][] {
  return events.map((event) => [
    event.at,
    event.actorName,
    event.actorEmail,
    event.actorKind === 'admin' ? 'Admin' : 'Member',
    event.actorRole,
    event.action,
    event.target,
    event.module,
    RESULT_LABELS[event.result],
    event.source ?? '',
    event.detail ?? '',
    (event.changes ?? []).map((change) => `${change.field}: ${change.before} -> ${change.after}`).join('; '),
    event.id,
  ]);
}

export function actorCounts(events: readonly AuditEventRecord[]): { admin: number; member: number } {
  const admin = events.filter((event) => event.actorKind === 'admin').length;
  return { admin, member: events.length - admin };
}
