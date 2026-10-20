import { describe, it, expect } from 'vitest';
import type { SapTransport, TransportActivity } from '../../../data-access';
import { filterActivity, filterTransports, importQueue, sortActivity, transportCounts, transportSummary, validateRoute } from './transports';

const tr = (trNumber: string, status: SapTransport['status'], date = '2026-09-01T10:00:00'): SapTransport => ({
  trNumber, description: `Change ${trNumber}`, type: 'Workbench', priority: 'Normal', owner: 'K.ANAND', status, route: null, date,
});
const list = [tr('A1', 'Open'), tr('A2', 'Released', '2026-09-03T10:00:00'), tr('A3', 'Released', '2026-09-02T10:00:00'), tr('A4', 'Imported'), tr('A5', 'Failed')];

describe('transport derivations', () => {
  it('summarises pending, imported, failed and released', () => {
    expect(transportSummary(list)).toEqual({ pendingImports: 2, successfullyImported: 1, failedErrors: 1, successfullyReleased: 4 });
    expect(transportSummary([])).toEqual({ pendingImports: 0, successfullyImported: 0, failedErrors: 0, successfullyReleased: 0 });
  });

  it('counts per status and in total', () => {
    expect(transportCounts(list)).toEqual({ All: 5, Open: 1, Released: 2, Imported: 1, Failed: 1 });
  });

  it('filters by status and search; queues released requests oldest first', () => {
    expect(filterTransports(list, 'Released', '').map((t) => t.trNumber)).toEqual(['A2', 'A3']);
    expect(filterTransports(list, 'All', 'a5')).toHaveLength(1);
    expect(importQueue(list).map((t) => t.trNumber)).toEqual(['A3', 'A2']);
  });

  it('validates the route', () => {
    expect(validateRoute('dev', 'qas')).toEqual({});
    expect(validateRoute('', 'qas').source).toBeDefined();
    expect(validateRoute('DEV', 'dev').target).toMatch(/differ/);
    expect(validateRoute('DEV', 'QUALITY').target).toBeDefined();
  });
});

describe('activity log', () => {
  const entry = (id: string, at: string, level: TransportActivity['level'], type: TransportActivity['type'], message: string): TransportActivity => ({ id, at, level, type, message, actor: 'System' });
  const log = [entry('1', '2026-09-01T06:00:00', 'Info', 'Sync', 'queue synced'), entry('2', '2026-09-02T06:00:00', 'Error', 'Import', 'import failed'), entry('3', '2026-09-02T06:00:00', 'Success', 'Release', 'released DEVK1')];

  it('sorts newest first without changing the input', () => {
    expect(sortActivity(log)[0].at).toBe('2026-09-02T06:00:00');
    expect(log[0].id).toBe('1');
  });

  it('filters by level, type and search', () => {
    expect(filterActivity(log, { level: 'Error', type: 'All', search: '' })).toHaveLength(1);
    expect(filterActivity(log, { level: 'All', type: 'Sync', search: '' })).toHaveLength(1);
    expect(filterActivity(log, { level: 'All', type: 'All', search: 'DEVK1' })).toHaveLength(1);
    expect(filterActivity(log, { level: 'Error', type: 'Sync', search: '' })).toHaveLength(0);
  });
});
