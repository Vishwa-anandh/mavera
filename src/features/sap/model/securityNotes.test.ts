import { describe, it, expect } from 'vitest';
import type { SecurityNote } from '../../../data-access';
import { filterNotes, parseNoteNumbers, securityNoteCounts } from './securityNotes';

const note = (over: Partial<SecurityNote>): SecurityNote => ({
  noteNumber: '1000001', title: 'A note', priority: 'Correction', component: 'BC-SEC', cvss: 5, releasedOn: null, downloadStatus: 'Downloaded', status: 'Unknown', ...over,
});

describe('parseNoteNumbers', () => {
  it('splits on commas, spaces and lines and sorts new, tracked, repeated and invalid entries', () => {
    const parsed = parseNoteNumbers('3727078, 3515598\n3727078 12345 abc 3800001;', ['3515598']);
    expect(parsed.fresh).toEqual(['3727078', '3800001']);
    expect(parsed.tracked).toEqual(['3515598']);
    expect(parsed.repeated).toBe(1);
    expect(parsed.invalid).toEqual(['12345', 'abc']);
  });

  it('accepts exactly seven digits', () => {
    expect(parseNoteNumbers('123456 12345678 1234567', []).fresh).toEqual(['1234567']);
  });

  it('returns nothing for blank input', () => {
    expect(parseNoteNumbers('  \n ', [])).toEqual({ fresh: [], tracked: [], invalid: [], repeated: 0 });
  });
});

describe('securityNoteCounts', () => {
  it('counts every status, including zeros', () => {
    const counts = securityNoteCounts([note({ status: 'Unknown' }), note({ status: 'Unknown' }), note({ status: 'Obsolete' })]);
    expect(counts.Unknown).toBe(2);
    expect(counts.Obsolete).toBe(1);
    expect(counts['Can Be Implemented']).toBe(0);
  });
});

describe('filterNotes', () => {
  const notes = [
    note({ noteNumber: '1000001', priority: 'Hot News', downloadStatus: 'Download failed' }),
    note({ noteNumber: '1000002', priority: null, component: null, title: 'Pending note', downloadStatus: 'Pending' }),
    note({ noteNumber: '1000003', status: 'Obsolete', component: 'FIN-AP' }),
  ];
  const all = { search: '', priority: 'All', status: 'All', download: 'All' } as const;

  it('filters by download status, priority, status and search together', () => {
    expect(filterNotes(notes, { ...all, download: 'Download failed' }).map((n) => n.noteNumber)).toEqual(['1000001']);
    expect(filterNotes(notes, { ...all, priority: 'Hot News' })).toHaveLength(1);
    expect(filterNotes(notes, { ...all, status: 'Obsolete' }).map((n) => n.noteNumber)).toEqual(['1000003']);
    expect(filterNotes(notes, { ...all, search: 'fin-ap' })).toHaveLength(1);
    expect(filterNotes(notes, { ...all, search: 'pending' }).map((n) => n.noteNumber)).toEqual(['1000002']);
  });
});
