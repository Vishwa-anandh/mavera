/** Parses a local-time ISO string ("2026-09-06T09:27:00") as local time, so it reads the same everywhere. */
export function parseStamp(iso: string): Date {
  return new Date(iso);
}

/** "Sep 6, 9:27 AM". */
export function formatStamp(iso: string): string {
  return parseStamp(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** "Sep 6, 2026, 9:27 AM" for places where the year matters (history, logs). */
export function formatStampWithYear(iso: string): string {
  return parseStamp(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** "14 Jul 2026, 16:30", the way SAP prints a note's release time. */
export function formatNoteRelease(iso: string): string {
  return parseStamp(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
