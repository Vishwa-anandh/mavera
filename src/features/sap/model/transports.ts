import type { SapTransport, TransportActivity, TransportLogLevel, TransportLogType, TransportStatus } from '../../../data-access';

export const TRANSPORT_STATUSES: TransportStatus[] = ['Open', 'Released', 'Imported', 'Failed'];
export const LOG_LEVELS: TransportLogLevel[] = ['Info', 'Success', 'Warning', 'Error'];
export const LOG_TYPES: TransportLogType[] = ['Sync', 'Release', 'Import', 'Route', 'Export'];

/** How many entries the on-page Activity Log shows; View All Logs opens the rest. */
export const LATEST_ACTIVITY_COUNT = 5;

export interface TransportSummary {
  pendingImports: number;
  successfullyImported: number;
  failedErrors: number;
  successfullyReleased: number;
}

/** Released requests wait for import; every request past Open has been released, whatever happened on import. */
export function transportSummary(transports: SapTransport[]): TransportSummary {
  const count = (status: TransportStatus) => transports.filter((t) => t.status === status).length;
  return {
    pendingImports: count('Released'),
    successfullyImported: count('Imported'),
    failedErrors: count('Failed'),
    successfullyReleased: count('Released') + count('Imported') + count('Failed'),
  };
}

export function transportCounts(transports: SapTransport[]): Record<TransportStatus | 'All', number> {
  return {
    All: transports.length,
    Open: transports.filter((t) => t.status === 'Open').length,
    Released: transports.filter((t) => t.status === 'Released').length,
    Imported: transports.filter((t) => t.status === 'Imported').length,
    Failed: transports.filter((t) => t.status === 'Failed').length,
  };
}

export function filterTransports(transports: SapTransport[], status: TransportStatus | 'All', search: string): SapTransport[] {
  const query = search.trim().toLowerCase();
  return transports.filter((t) => (status === 'All' || t.status === status) && (!query || `${t.trNumber} ${t.description} ${t.owner}`.toLowerCase().includes(query)));
}

/** Released requests still waiting to be imported, oldest first (the order they should go in). */
export function importQueue(transports: SapTransport[]): SapTransport[] {
  return transports.filter((t) => t.status === 'Released').sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Newest first. Stable for entries with the same time. */
export function sortActivity(entries: TransportActivity[]): TransportActivity[] {
  return [...entries].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

export interface ActivityFilters {
  level: TransportLogLevel | 'All';
  type: TransportLogType | 'All';
  search: string;
}

export function filterActivity(entries: TransportActivity[], { level, type, search }: ActivityFilters): TransportActivity[] {
  const query = search.trim().toLowerCase();
  return entries.filter((e) => (level === 'All' || e.level === level) && (type === 'All' || e.type === type) && (!query || `${e.message} ${e.actor}`.toLowerCase().includes(query)));
}

/** SAP system IDs are three letters or digits. */
export const SYSTEM_ID_PATTERN = /^[A-Z0-9]{3}$/;

export function validateRoute(source: string, target: string): { source?: string; target?: string } {
  const errors: { source?: string; target?: string } = {};
  const s = source.trim().toUpperCase();
  const t = target.trim().toUpperCase();
  if (!SYSTEM_ID_PATTERN.test(s)) errors.source = 'Use a 3-character system ID, e.g. DEV.';
  if (!SYSTEM_ID_PATTERN.test(t)) errors.target = 'Use a 3-character system ID, e.g. QAS.';
  else if (s === t) errors.target = 'The target must differ from the source.';
  return errors;
}

export const LEVEL_TONE: Record<TransportLogLevel, 'neutral' | 'success' | 'warning' | 'danger'> = { Info: 'neutral', Success: 'success', Warning: 'warning', Error: 'danger' };
export const TRANSPORT_TONE: Record<TransportStatus, 'neutral' | 'info' | 'success' | 'danger'> = { Open: 'neutral', Released: 'info', Imported: 'success', Failed: 'danger' };
