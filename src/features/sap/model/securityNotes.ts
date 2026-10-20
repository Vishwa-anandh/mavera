import type { NoteDownloadStatus, SecurityNote, SecurityNotePriority, SecurityNoteStatus } from '../../../data-access';

export const NOTE_STATUSES: SecurityNoteStatus[] = [
  'Completely Implemented', 'Can Be Implemented', 'Cannot Be Implemented', 'Incompletely Implemented', 'Obsolete', 'Unknown',
];
export const NOTE_PRIORITIES: SecurityNotePriority[] = ['Hot News', 'High Priority', 'Correction', 'Optional'];
export const NOTE_DOWNLOAD_STATUSES: NoteDownloadStatus[] = ['Already Downloaded', 'Downloaded', 'Pending', 'Not downloaded', 'Download failed'];

export const NOTE_NUMBER_PATTERN = /^\d{7}$/;

export interface ParsedNoteNumbers {
  /** Valid, unique and not yet tracked: these will be added. */
  fresh: string[];
  /** Valid and unique but already tracked: these will be refreshed. */
  tracked: string[];
  /** Entries that are not 7-digit note numbers, as typed. */
  invalid: string[];
  /** Valid numbers typed more than once. */
  repeated: number;
}

/**
 * Splits pasted text on commas, spaces and line breaks and sorts the pieces into new notes, notes already
 * tracked, repeats and invalid entries. A SAP note number is exactly seven digits.
 */
export function parseNoteNumbers(text: string, trackedNumbers: Iterable<string>): ParsedNoteNumbers {
  const tracked = new Set(trackedNumbers);
  const seen = new Set<string>();
  const result: ParsedNoteNumbers = { fresh: [], tracked: [], invalid: [], repeated: 0 };
  for (const token of text.split(/[\s,;]+/).filter(Boolean)) {
    if (!NOTE_NUMBER_PATTERN.test(token)) {
      if (!result.invalid.includes(token)) result.invalid.push(token);
      continue;
    }
    if (seen.has(token)) {
      result.repeated += 1;
      continue;
    }
    seen.add(token);
    (tracked.has(token) ? result.tracked : result.fresh).push(token);
  }
  return result;
}

export function securityNoteCounts(notes: SecurityNote[]): Record<SecurityNoteStatus, number> {
  const counts = Object.fromEntries(NOTE_STATUSES.map((s) => [s, 0])) as Record<SecurityNoteStatus, number>;
  for (const note of notes) counts[note.status] += 1;
  return counts;
}

export interface NoteFilters {
  search: string;
  priority: 'All' | SecurityNotePriority;
  status: 'All' | SecurityNoteStatus;
  download: 'All' | NoteDownloadStatus;
}

export function filterNotes(notes: SecurityNote[], { search, priority, status, download }: NoteFilters): SecurityNote[] {
  const query = search.trim().toLowerCase();
  return notes.filter((note) => {
    if (priority !== 'All' && note.priority !== priority) return false;
    if (status !== 'All' && note.status !== status) return false;
    if (download !== 'All' && note.downloadStatus !== download) return false;
    return !query || `${note.noteNumber} ${note.title} ${note.component ?? ''}`.toLowerCase().includes(query);
  });
}

export const STATUS_TONE: Record<SecurityNoteStatus, 'success' | 'info' | 'danger' | 'warning' | 'neutral'> = {
  'Completely Implemented': 'success',
  'Can Be Implemented': 'info',
  'Cannot Be Implemented': 'danger',
  'Incompletely Implemented': 'warning',
  Obsolete: 'neutral',
  Unknown: 'neutral',
};

export const PRIORITY_TONE: Record<SecurityNotePriority, 'danger' | 'warning' | 'info' | 'neutral'> = {
  'Hot News': 'danger', 'High Priority': 'warning', Correction: 'info', Optional: 'neutral',
};

export const DOWNLOAD_TONE: Record<NoteDownloadStatus, 'success' | 'info' | 'danger' | 'neutral'> = {
  'Already Downloaded': 'success', Downloaded: 'success', Pending: 'info', 'Not downloaded': 'neutral', 'Download failed': 'danger',
};
