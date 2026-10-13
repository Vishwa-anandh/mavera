import { describe, it, expect, beforeEach } from 'vitest';
import { idocRepository } from '../../../data-access';
import { idocKpis, groupStats, formatAge, dailySeries } from './idocDerivations';
import { statusInfo } from './idocStatus';
import { reprocessIdocs, resetIdocState } from './idocStore';
import { applyIdocFilters } from './idocFilters';

const records = idocRepository.listRecords();

describe('IDoc status mapping', () => {
  it('maps standard SAP codes to a lifecycle and keeps unknown codes visible as unmapped', () => {
    expect(statusInfo('51')).toMatchObject({ lifecycle: 'Failed', description: 'Application document not posted', reprocessable: true });
    expect(statusInfo('53').lifecycle).toBe('Completed');
    expect(statusInfo('64').lifecycle).toBe('Waiting');
    expect(statusInfo('75')).toMatchObject({ lifecycle: 'Unmapped', description: 'Unmapped status 75', reprocessable: false });
  });

  it('explains why a failed status cannot be reprocessed directly', () => {
    expect(statusInfo('56').reprocessable).toBe(false);
    expect(statusInfo('56').reprocessHint).toMatch(/partner profile/i);
  });
});

describe('IDoc sample records', () => {
  it('keep 16-digit IDoc numbers with leading zeros', () => {
    for (const r of records) expect(r.docnum).toMatch(/^0+\d+$/);
    expect(records.every((r) => r.docnum.length === 16)).toBe(true);
  });

  it('add up: success rate excludes open records from the denominator', () => {
    const k = idocKpis(records);
    expect(k.total).toBe(44);
    expect(k.inbound + k.outbound).toBe(k.total);
    expect(k.completed + k.failed + k.open).toBe(k.total);
    expect(k.successRate).toBe(Math.round((k.completed / (k.completed + k.failed)) * 1000) / 10);
  });

  it('groups by partner with failure counts and waiting age', () => {
    const groups = groupStats(records, (r) => r.partner);
    expect(groups.reduce((sum, g) => sum + g.count, 0)).toBe(records.length);
    const mst = groups.find((g) => g.key === 'MSTCLNT200');
    expect(mst?.failed).toBeGreaterThan(0);
  });

  it('builds a 14-day series that keeps empty days', () => {
    const series = dailySeries(records);
    expect(series).toHaveLength(14);
    expect(series.reduce((s, d) => s + d.total, 0)).toBeLessThanOrEqual(records.length);
  });

  it('matches an IDoc number with or without its leading zeros', () => {
    const target = records[0];
    const short = target.docnum.replace(/^0+/, '');
    const base = { partner: 'All', messageType: 'All', direction: 'All' };
    expect(applyIdocFilters(records, { ...base, search: short }).map((r) => r.docnum)).toContain(target.docnum);
    expect(applyIdocFilters(records, { ...base, search: target.docnum }).map((r) => r.docnum)).toContain(target.docnum);
  });

  it('formats ages for people', () => {
    expect(formatAge(null)).toBe('Unavailable');
    expect(formatAge(45)).toBe('45 min');
    expect(formatAge(125)).toBe('2 h 5 min');
    expect(formatAge(60 * 50)).toBe('2 d 2 h');
  });
});

describe('reprocessing', () => {
  beforeEach(() => resetIdocState());

  it('submits a Pending retry for supported failures and skips the rest with a reason', () => {
    const retryable = records.find((r) => r.statusCode === '51' && !r.retries.some((x) => x.result === 'Pending'))!;
    const profileError = records.find((r) => r.statusCode === '56')!;
    const posted = records.find((r) => r.statusCode === '53')!;

    const outcome = reprocessIdocs([retryable.docnum, profileError.docnum, posted.docnum]);
    expect(outcome.submitted).toEqual([retryable.docnum]);
    expect(outcome.skipped.map((s) => s.docnum).sort()).toEqual([profileError.docnum, posted.docnum].sort());
    expect(outcome.skipped.find((s) => s.docnum === profileError.docnum)?.reason).toMatch(/partner profile/i);

    // A second attempt while the first is pending is refused.
    expect(reprocessIdocs([retryable.docnum]).skipped[0].reason).toMatch(/already pending/i);
  });
});
