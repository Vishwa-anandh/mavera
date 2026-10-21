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

export const NOTE_FILE_MAX_BYTES = 1024 * 1024;
const NOTE_FILE_EXTENSIONS = ['.csv', '.txt'];
const SPREADSHEET_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.ods'];

export const NOTE_FILE_HELP = 'Or choose a .csv or .txt file with one or more note numbers per line. Excel files cannot be read here: in Excel use File, Save As, CSV, then choose that file.';

export interface ParsedNoteFile {
  /** Entries that are exactly seven digits, in file order (repeats kept; the dialog counts them). */
  numbers: string[];
  /** Entries that are not 7-digit numbers and were ignored. A header row is not counted. */
  skipped: number;
  /** True when the first line looked like a column header ("Note number") and was left out. */
  headerRow: boolean;
}

/**
 * Reads note numbers out of CSV or plain text. Entries are separated by commas, semicolons, tabs or spaces, one or many per
 * line. A first line with no digits at all ("Note number,Title") is a header and is not counted. Anything else that is not
 * exactly seven digits is ignored and counted in `skipped`. Surrounding quotes and a byte-order mark are removed.
 */
export function parseNoteFile(content: string): ParsedNoteFile {
  const withoutMark = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const lines = withoutMark.split(/\r\n|\r|\n/).filter((line) => line.trim() !== '');
  const entriesOf = (line: string) => line.split(/[\s,;]+/).map((cell) => cell.replace(/^["']+|["']+$/g, '')).filter(Boolean);
  const headerRow = lines.length > 0 && !/\d/.test(lines[0]);
  const result: ParsedNoteFile = { numbers: [], skipped: 0, headerRow };
  for (const line of headerRow ? lines.slice(1) : lines) {
    for (const entry of entriesOf(line)) {
      if (NOTE_NUMBER_PATTERN.test(entry)) result.numbers.push(entry);
      else result.skipped += 1;
    }
  }
  return result;
}

/** Why a chosen file cannot be used, or null when it can. Only name and size are checked here. */
export function noteFileProblem(file: { name: string; size: number }): string | null {
  const name = file.name.toLowerCase();
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  if (SPREADSHEET_EXTENSIONS.includes(extension)) return `${file.name} is a spreadsheet. Save it as CSV from Excel (File, Save As, CSV) and choose that file.`;
  if (!NOTE_FILE_EXTENSIONS.includes(extension)) return `${file.name} is not a .csv or .txt file.`;
  if (file.size === 0) return `${file.name} is empty.`;
  if (file.size > NOTE_FILE_MAX_BYTES) return `${file.name} is larger than 1 MB. A list of note numbers should be far smaller.`;
  return null;
}
