import type {
  AlertSettings, AlertThresholdConfig, AlertThresholds, NoteCheckResult, NoteHistoryEntry, NoteUploadResult, SapAlertSource,
  SapDestination, SapDestinationInput, SapSmartAlert, SecurityNote, TransportActivity, TransportLogLevel, TransportLogType, TransportState,
} from '../contracts/sapAdmin';
import { SEED_SECURITY_NOTES, SEED_NOTE_HISTORY, simulateNoteCheck } from '../../demo/sap/mockSecurityNotes';
import { SEED_SAP_DESTINATIONS } from '../../demo/sap/mockSystemConfiguration';
import { seedTransportState } from '../../demo/sap/mockTransportManagement';
import { DEFAULT_ALERT_SETTINGS, DETECTION_SCHEDULE, SEED_ALERT_RECIPIENTS, SEED_SAP_ALERTS, seedThresholds } from '../../demo/sap/mockSapAlerts';

/**
 * Security Notes, System Configuration, Transport Management and SAP Alerts.
 * PROTOTYPE: there is no backend for these yet. State lives in module memory so it survives moving
 * between pages for the rest of the session (and is gone on reload); every method that would be a
 * network call returns a promise that settles after a short simulated delay. Swap each body for the
 * matching REST call when the endpoints exist. Reads return copies.
 */
const DEFAULT_LATENCY_MS = 450;
let latencyMs = DEFAULT_LATENCY_MS;
let counter = 0;

const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter += 1)}`;
/** Local-time ISO string, "2026-09-06T09:27:00". */
const stamp = (at: Date = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}T${p(at.getHours())}:${p(at.getMinutes())}:${p(at.getSeconds())}`;
};
const simulate = <T>(work: () => T): Promise<T> => new Promise<T>((resolve) => { setTimeout(() => resolve(work()), latencyMs); });

// ---- State -----------------------------------------------------------------------------------

let notes: SecurityNote[] = structuredClone(SEED_SECURITY_NOTES);
let noteHistory: NoteHistoryEntry[] = structuredClone(SEED_NOTE_HISTORY);
let destinations: SapDestination[] = structuredClone(SEED_SAP_DESTINATIONS);
let transport: TransportState = seedTransportState();
let alerts: SapSmartAlert[] = structuredClone(SEED_SAP_ALERTS);
let alertSettings: AlertSettings = { ...DEFAULT_ALERT_SETTINGS };
let thresholds: AlertThresholds = seedThresholds();
let recipients: string[] = [...SEED_ALERT_RECIPIENTS];
/** When settings or thresholds were last saved; the alerts page counts this month's. */
let adjustments: string[] = [];

/** Restores every store to its seed. Tests call this between cases; the app never does. */
export function resetSapAdminStore(): void {
  notes = structuredClone(SEED_SECURITY_NOTES);
  noteHistory = structuredClone(SEED_NOTE_HISTORY);
  destinations = structuredClone(SEED_SAP_DESTINATIONS);
  transport = seedTransportState();
  alerts = structuredClone(SEED_SAP_ALERTS);
  alertSettings = { ...DEFAULT_ALERT_SETTINGS };
  thresholds = seedThresholds();
  recipients = [...SEED_ALERT_RECIPIENTS];
  adjustments = [];
}

/** Test hook: how long simulated calls take. */
export function setSapAdminLatency(ms: number): void {
  latencyMs = ms;
}

// ---- Security notes --------------------------------------------------------------------------

const logNote = (kind: NoteHistoryEntry['kind'], actor: string, summary: string, counts: NoteHistoryEntry['counts']) => {
  noteHistory = [{ id: nextId('hist'), kind, at: stamp(), actor, summary, counts }, ...noteHistory];
};

const applyCheck = (note: SecurityNote): SecurityNote => {
  const result = simulateNoteCheck(note.noteNumber);
  if (!result.details) return { ...note, downloadStatus: result.downloadStatus, status: result.status };
  return { ...note, ...result.details, downloadStatus: result.downloadStatus, status: result.status };
};

const securityNotes = {
  list(): SecurityNote[] {
    return structuredClone(notes);
  },
  /** Newest first. */
  history(): NoteHistoryEntry[] {
    return structuredClone(noteHistory);
  },
  /** Adds note numbers as Unknown with their SAP download pending; numbers already tracked count as updated. */
  upload(numbers: string[], actor: string): Promise<NoteUploadResult> {
    return simulate(() => {
      const unique = [...new Set(numbers)];
      const known = new Set(notes.map((n) => n.noteNumber));
      const added = unique.filter((n) => !known.has(n));
      const updated = unique.filter((n) => known.has(n));
      const fresh: SecurityNote[] = added.map((noteNumber) => ({
        noteNumber, title: `SAP Security Note ${noteNumber}`, priority: null, component: null, cvss: null, releasedOn: null, downloadStatus: 'Pending', status: 'Unknown',
      }));
      notes = [...fresh, ...notes];
      logNote('upload', actor, `Uploaded ${unique.length} note number${unique.length === 1 ? '' : 's'}`, [
        { label: 'Total', value: unique.length }, { label: 'Inserted', value: added.length }, { label: 'Updated', value: updated.length }, { label: 'Errors', value: 0 },
      ]);
      return { added, updated };
    });
  },
  /** Asks SAP about every note whose status is still Unknown. */
  checkStatus(actor: string): Promise<NoteCheckResult> {
    return simulate(() => {
      const pending = notes.filter((n) => n.status === 'Unknown');
      const checked = new Map(pending.map((n) => [n.noteNumber, applyCheck(n)]));
      notes = notes.map((n) => checked.get(n.noteNumber) ?? n);
      const resolved = [...checked.values()].filter((n) => n.status !== 'Unknown').length;
      const result = { checked: pending.length, resolved, failed: pending.length - resolved };
      if (pending.length > 0) {
        logNote('check', actor, `Checked ${pending.length} unknown note${pending.length === 1 ? '' : 's'} against SAP`, [
          { label: 'Checked', value: result.checked }, { label: 'Resolved', value: result.resolved }, { label: 'Failed', value: result.failed },
        ]);
      }
      return result;
    });
  },
  /** Asks SAP again about one note. A known status stays as SAP last reported it; an Unknown one is resolved. */
  recheck(noteNumber: string, actor: string): Promise<SecurityNote | null> {
    return simulate(() => {
      const current = notes.find((n) => n.noteNumber === noteNumber);
      if (!current) return null;
      let next = current;
      if (current.status === 'Unknown') next = applyCheck(current);
      else if (current.downloadStatus === 'Download failed' || current.downloadStatus === 'Not downloaded' || current.downloadStatus === 'Pending') next = { ...current, downloadStatus: 'Downloaded' };
      notes = notes.map((n) => (n.noteNumber === noteNumber ? next : n));
      logNote('recheck', actor, `Rechecked note ${noteNumber}: ${next.status}`, [{ label: 'Checked', value: 1 }, { label: 'Failed', value: next.status === 'Unknown' ? 1 : 0 }]);
      return structuredClone(next);
    });
  },
  remove(noteNumber: string, actor: string): Promise<boolean> {
    return simulate(() => {
      if (!notes.some((n) => n.noteNumber === noteNumber)) return false;
      notes = notes.filter((n) => n.noteNumber !== noteNumber);
      logNote('delete', actor, `Deleted note ${noteNumber}`, [{ label: 'Deleted', value: 1 }]);
      return true;
    });
  },
};

// ---- System configuration --------------------------------------------------------------------

const buildDestination = (id: string, input: SapDestinationInput, previous?: SapDestination): SapDestination => {
  const systems = input.systems;
  const first = systems[0] ?? '';
  const shortLabel = previous && (previous.shortLabel === '' || systems.includes(previous.shortLabel)) ? previous.shortLabel : first;
  return {
    id,
    name: input.name.trim(),
    shortLabel,
    status: previous?.status ?? 'Ready To Connect',
    connectionType: input.connectionType,
    url: input.url.trim(),
    systems,
    hanaConfigured: previous?.hanaConfigured ?? false,
    timezone: input.timezone,
    client: input.client.trim(),
    language: input.language.trim(),
    username: input.username.trim(),
  };
};

const destinationRepo = {
  list(): SapDestination[] {
    return structuredClone(destinations);
  },
  add(input: SapDestinationInput): SapDestination {
    const created = buildDestination(nextId('dest'), input);
    destinations = [...destinations, created];
    return structuredClone(created);
  },
  update(id: string, input: SapDestinationInput): SapDestination | null {
    const previous = destinations.find((d) => d.id === id);
    if (!previous) return null;
    const updated = buildDestination(id, input, previous);
    destinations = destinations.map((d) => (d.id === id ? updated : d));
    return structuredClone(updated);
  },
  remove(id: string): boolean {
    const before = destinations.length;
    destinations = destinations.filter((d) => d.id !== id);
    return destinations.length < before;
  },
  setConnected(id: string, connected: boolean): SapDestination | null {
    const target = destinations.find((d) => d.id === id);
    if (!target) return null;
    const updated: SapDestination = { ...target, status: connected ? 'Connected' : 'Ready To Connect' };
    destinations = destinations.map((d) => (d.id === id ? updated : d));
    return structuredClone(updated);
  },
};

// ---- Transport management --------------------------------------------------------------------

const logTransport = (level: TransportLogLevel, type: TransportLogType, message: string, actor: string) => {
  const entry: TransportActivity = { id: nextId('act'), at: stamp(), level, type, message, actor };
  transport = { ...transport, activity: [entry, ...transport.activity] };
};

const transportRepo = {
  getState(): TransportState {
    return structuredClone(transport);
  },
  /** Re-reads the STMS queue. */
  refresh(actor: string): Promise<TransportState> {
    return simulate(() => {
      transport = { ...transport, lastSync: stamp() };
      logTransport('Info', 'Sync', 'STMS queue refreshed on request.', actor);
      return structuredClone(transport);
    });
  },
  /** Imports released requests into the route's target system; anything not Released is left alone. */
  importTransports(trNumbers: string[], actor: string): Promise<TransportState> {
    return simulate(() => {
      const target = transport.route?.target ?? 'the target system';
      const wanted = new Set(trNumbers);
      const imported = transport.transports.filter((t) => wanted.has(t.trNumber) && t.status === 'Released');
      const done = new Set(imported.map((t) => t.trNumber));
      transport = { ...transport, transports: transport.transports.map((t) => (done.has(t.trNumber) ? { ...t, status: 'Imported' } : t)) };
      for (const t of imported) logTransport('Success', 'Import', `${t.trNumber} imported into ${target}.`, actor);
      return structuredClone(transport);
    });
  },
  setRoute(source: string, target: string, actor: string): TransportState {
    transport = { ...transport, route: { source, target } };
    logTransport('Info', 'Route', `Import route set to ${source} → ${target}.`, actor);
    return structuredClone(transport);
  },
  recordExport(count: number, actor: string): TransportState {
    logTransport('Info', 'Export', `Transport list exported (${count} request${count === 1 ? '' : 's'}).`, actor);
    return structuredClone(transport);
  },
};

// ---- SAP alerts ------------------------------------------------------------------------------

const updateAlert = (id: string, change: (alert: SapSmartAlert) => SapSmartAlert): SapSmartAlert | null => {
  const found = alerts.find((a) => a.id === id);
  if (!found) return null;
  const next = change(found);
  alerts = alerts.map((a) => (a.id === id ? next : a));
  return structuredClone(next);
};

const alertRepo = {
  list(): SapSmartAlert[] {
    return structuredClone(alerts);
  },
  markRead(id: string): SapSmartAlert | null {
    return updateAlert(id, (a) => ({ ...a, read: true }));
  },
  /** Marks every active alert read; `source` limits it to one origin. */
  markAllRead(source?: SapAlertSource): number {
    const targets = alerts.filter((a) => a.state === 'active' && !a.read && (!source || a.source === source));
    const ids = new Set(targets.map((a) => a.id));
    alerts = alerts.map((a) => (ids.has(a.id) ? { ...a, read: true } : a));
    return targets.length;
  },
  resolve(id: string): SapSmartAlert | null {
    return updateAlert(id, (a) => ({ ...a, read: true, state: 'resolved', stateChangedAt: stamp() }));
  },
  ignore(id: string): SapSmartAlert | null {
    return updateAlert(id, (a) => ({ ...a, read: true, state: 'ignored', stateChangedAt: stamp() }));
  },
  reopen(id: string): SapSmartAlert | null {
    return updateAlert(id, (a) => ({ ...a, state: 'active', stateChangedAt: null }));
  },
  getSettings(): AlertSettings {
    return { ...alertSettings };
  },
  saveSettings(next: AlertSettings): AlertSettings {
    alertSettings = { ...next };
    adjustments = [...adjustments, stamp()];
    return { ...alertSettings };
  },
  resetSettings(): AlertSettings {
    alertSettings = { ...DEFAULT_ALERT_SETTINGS };
    adjustments = [...adjustments, stamp()];
    return { ...alertSettings };
  },
  getDefaultSettings(): AlertSettings {
    return { ...DEFAULT_ALERT_SETTINGS };
  },
  getThresholds(): AlertThresholds {
    return structuredClone(thresholds);
  },
  saveThresholds(source: 'hana' | 'sap', next: AlertThresholdConfig[]): AlertThresholds {
    thresholds = { ...thresholds, [source]: structuredClone(next) };
    adjustments = [...adjustments, stamp()];
    return structuredClone(thresholds);
  },
  /** Timestamps of every settings or threshold save this session. */
  listAdjustments(): string[] {
    return [...adjustments];
  },
  detectionSchedule(): string {
    return DETECTION_SCHEDULE;
  },
  listRecipients(): string[] {
    return [...recipients];
  },
  addRecipient(email: string): string[] {
    const clean = email.trim();
    if (clean && !recipients.some((r) => r.toLowerCase() === clean.toLowerCase())) recipients = [...recipients, clean];
    return [...recipients];
  },
  removeRecipient(email: string): string[] {
    recipients = recipients.filter((r) => r.toLowerCase() !== email.toLowerCase());
    return [...recipients];
  },
};

export const sapAdminRepository = { securityNotes, destinations: destinationRepo, transport: transportRepo, alerts: alertRepo };
