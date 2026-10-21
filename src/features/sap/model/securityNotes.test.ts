import { describe, it, expect } from 'vitest';
import type { SecurityNote } from '../../../data-access';
import { filterNotes, noteFileProblem, parseNoteFile, parseNoteNumbers, securityNoteCounts } from './securityNotes';

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

describe('parseNoteFile', () => {
  it('reads one or many numbers per line, separated by commas, semicolons, tabs or spaces', () => {
    const parsed = parseNoteFile('3727078\n3515598, 3763800;3800001\t3800002 3800003\r\n');
    expect(parsed.numbers).toEqual(['3727078', '3515598', '3763800', '3800001', '3800002', '3800003']);
    expect(parsed.skipped).toBe(0);
    expect(parsed.headerRow).toBe(false);
  });

  it('leaves out a header row without counting it, and counts every other entry that is not seven digits', () => {
    const parsed = parseNoteFile(String.fromCharCode(0xfeff) + 'Note number\n"3727078"\n12345\nabc\n3515598,12345678\n\n');
    expect(parsed.headerRow).toBe(true);
    expect(parsed.numbers).toEqual(['3727078', '3515598']);
    expect(parsed.skipped).toBe(3);
  });

  it('does not treat a first line that holds a number as a header', () => {
    expect(parseNoteFile('3727078,Title').headerRow).toBe(false);
    expect(parseNoteFile('3727078,Title')).toMatchObject({ numbers: ['3727078'], skipped: 1 });
  });

  it('returns nothing for an empty file', () => {
    expect(parseNoteFile('')).toEqual({ numbers: [], skipped: 0, headerRow: false });
    expect(parseNoteFile('\n \n')).toEqual({ numbers: [], skipped: 0, headerRow: false });
  });
});

describe('noteFileProblem', () => {
  it('accepts a csv or txt file of a sensible size, whatever the letter case', () => {
    expect(noteFileProblem({ name: 'notes.csv', size: 200 })).toBeNull();
    expect(noteFileProblem({ name: 'NOTES.TXT', size: 200 })).toBeNull();
  });
  it('points Excel users at Save As CSV', () => {
    expect(noteFileProblem({ name: 'notes.xlsx', size: 5000 })).toMatch(/Save it as CSV/);
    expect(noteFileProblem({ name: 'old.xls', size: 5000 })).toMatch(/Save it as CSV/);
  });
  it('rejects other types, empty files and files over 1 MB', () => {
    expect(noteFileProblem({ name: 'notes.pdf', size: 10 })).toMatch(/not a \.csv or \.txt/);
    expect(noteFileProblem({ name: 'notes', size: 10 })).toMatch(/not a \.csv or \.txt/);
    expect(noteFileProblem({ name: 'notes.csv', size: 0 })).toMatch(/empty/);
    expect(noteFileProblem({ name: 'notes.csv', size: 2 * 1024 * 1024 })).toMatch(/larger than 1 MB/);
  });
});
