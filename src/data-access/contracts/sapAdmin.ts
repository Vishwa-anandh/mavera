/**
 * Contracts for the SAP administration pages: Security Notes, System Configuration, Transport
 * Management and SAP Alerts. Timestamps are local-time ISO strings ("2026-09-06T09:27:00") so
 * they sort lexically and read the same in every time zone.
 */

// ---- Security notes -------------------------------------------------------------------------

export type SecurityNoteStatus =
  | 'Completely Implemented'
  | 'Can Be Implemented'
  | 'Cannot Be Implemented'
  | 'Incompletely Implemented'
  | 'Obsolete'
  | 'Unknown';

export type SecurityNotePriority = 'Hot News' | 'High Priority' | 'Correction' | 'Optional';

/** Where the note's text stands in the SAP download. "Pending" is a freshly uploaded number. */
export type NoteDownloadStatus = 'Already Downloaded' | 'Downloaded' | 'Pending' | 'Not downloaded' | 'Download failed';

export interface SecurityNote {
  noteNumber: string;
  title: string;
  /** Null until SAP has been asked about a freshly uploaded number. */
  priority: SecurityNotePriority | null;
  component: string | null;
  cvss: number | null;
  releasedOn: string | null;
  downloadStatus: NoteDownloadStatus;
  status: SecurityNoteStatus;
}

export type NoteHistoryKind = 'upload' | 'check' | 'recheck' | 'delete';

export interface NoteHistoryEntry {
  id: string;
  kind: NoteHistoryKind;
  at: string;
  actor: string;
  summary: string;
  counts: Array<{ label: string; value: number }>;
}

export interface NoteUploadResult {
  added: string[];
  updated: string[];
}

export interface NoteCheckResult {
  checked: number;
  resolved: number;
  failed: number;
}

// ---- System configuration -------------------------------------------------------------------

export type SapConnectionType = 'BTP_API' | 'ODATA' | 'RFC';

export interface SapDestination {
  id: string;
  name: string;
  /** The SID shown beside the name; blank when the destination has none of its own. */
  shortLabel: string;
  status: 'Connected' | 'Ready To Connect';
  connectionType: SapConnectionType;
  url: string;
  systems: string[];
  hanaConfigured: boolean;
  timezone: string;
  client: string;
  language: string;
  username: string;
}

/** What the add/edit form collects. The password is never kept by the front end. */
export interface SapDestinationInput {
  name: string;
  systems: string[];
  timezone: string;
  connectionType: SapConnectionType;
  url: string;
  client: string;
  language: string;
  username: string;
}

// ---- Transport management -------------------------------------------------------------------

export type TransportStatus = 'Open' | 'Released' | 'Imported' | 'Failed';

export interface SapTransport {
  trNumber: string;
  description: string;
  type: 'Workbench' | 'Customizing';
  priority: 'High' | 'Normal';
  owner: string;
  status: TransportStatus;
  route: string | null;
  date: string;
}

export type TransportLogLevel = 'Info' | 'Success' | 'Warning' | 'Error';
export type TransportLogType = 'Sync' | 'Release' | 'Import' | 'Route' | 'Export';

export interface TransportActivity {
  id: string;
  at: string;
  level: TransportLogLevel;
  type: TransportLogType;
  message: string;
  actor: string;
}

export interface TransportState {
  stmsConnected: boolean;
  lastSync: string | null;
  route: { source: string; target: string } | null;
  transports: SapTransport[];
  activity: TransportActivity[];
}

// ---- SAP alerts -----------------------------------------------------------------------------

export type SapAlertSource = 'HANA' | 'SAP';
export type SapAlertType = 'CPU' | 'Memory' | 'Disk' | 'Sessions' | 'Dumps' | 'Jobs' | 'Locks' | 'Work Processes';
export type SapAlertSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type SapAlertState = 'active' | 'resolved' | 'ignored';

export interface SapSmartAlert {
  id: string;
  source: SapAlertSource;
  type: SapAlertType;
  severity: SapAlertSeverity;
  system: string;
  message: string;
  detectedAt: string;
  read: boolean;
  state: SapAlertState;
  /** When the alert was resolved or ignored; null while it is active. */
  stateChangedAt: string | null;
}

/** The Holt-Winters anomaly-detection parameters. */
export interface AlertSettings {
  /** Standard-deviation multiplier; lower is more sensitive. */
  sensitivity: number;
  /** Smallest change (percent) that may fire an anomaly. */
  minDeltaPercent: number;
  /** Days of history needed before detection switches on. */
  minHistoryDays: number;
  /** Hours before the same anomaly can fire again. */
  cooldownHours: number;
}

export interface AlertThresholdConfig {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  threshold: number;
  /** Upper end of the slider. */
  max: number;
  unit: string;
}

export interface AlertThresholds {
  hana: AlertThresholdConfig[];
  sap: AlertThresholdConfig[];
}
