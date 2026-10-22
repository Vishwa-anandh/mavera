import { describe, it, expect } from 'vitest';
import type { SapDestination } from '../../../data-access';
import { draftFromDestination, emptyDraft, filterDestinations, parseSystems, toInput, validateDestination } from './destinations';

const dest = (over: Partial<SapDestination> = {}): SapDestination => ({
  id: 'd1', name: 'Prod', shortLabel: 'PRD', status: 'Ready To Connect', connectionType: 'ODATA', url: 'https://sap.example.com', systems: ['PRD'], hanaConfigured: false,
  timezone: 'UTC — UTC+0', client: '100', language: 'EN', username: 'svc', ...over,
});

describe('destination form', () => {
  it('parses SIDs upper-cased and de-duplicated', () => {
    expect(parseSystems('grc, GRQ  msq;grc')).toEqual(['GRC', 'GRQ', 'MSQ']);
  });

  it('requires a name, a SID and a full URL', () => {
    expect(validateDestination(emptyDraft(), [])).toEqual({ name: 'Enter an environment name.', systems: 'Enter at least one SID.', url: 'Enter the gateway URL.' });
    expect(validateDestination({ ...emptyDraft(), name: 'X', systems: 'X1', url: 'sap.example.com' }, []).url).toMatch(/https/);
    expect(validateDestination({ ...emptyDraft(), name: 'X', systems: 'X1', url: 'https://sap.example.com' }, [])).toEqual({});
  });

  it('rejects a duplicate name but not the destination being edited', () => {
    const draft = { ...draftFromDestination(dest()), name: 'prod' };
    expect(validateDestination(draft, [dest()]).name).toMatch(/already exists/);
    expect(validateDestination(draft, [dest()], 'd1')).toEqual({});
  });

  it('round-trips a destination through the form', () => {
    const input = toInput(draftFromDestination(dest({ systems: ['GRC', 'MSQ'] })));
    expect(input.systems).toEqual(['GRC', 'MSQ']);
    expect(input.client).toBe('100');
  });
});

describe('filterDestinations', () => {
  it('matches name or URL, ignoring case', () => {
    const list = [dest(), dest({ id: 'd2', name: 'QA', url: 'https://qa.example.org' })];
    expect(filterDestinations(list, 'qa').map((d) => d.id)).toEqual(['d2']);
    expect(filterDestinations(list, 'EXAMPLE.COM').map((d) => d.id)).toEqual(['d1']);
    expect(filterDestinations(list, '  ')).toHaveLength(2);
  });
});
