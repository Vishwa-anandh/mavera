import { describe, it, expect } from 'vitest';
import { nameFromEmail, seatSummary, validateNewMember, type OrgMember } from './userManagementTypes';

const member = (over: Partial<OrgMember>): OrgMember => ({
  userId: 'u', fullName: 'A B', email: 'a@x.com', role: 'member', status: 'active', ...over,
});

describe('seatSummary', () => {
  const members = [member({ userId: '1' }), member({ userId: '2' }), member({ userId: '3', status: 'inactive' })];

  it('counts only active members against the limit', () => {
    expect(seatSummary(members, 5)).toEqual({ limit: 5, used: 2, available: 3, full: false });
  });

  it('is full when active members reach the limit', () => {
    expect(seatSummary(members, 2)).toMatchObject({ available: 0, full: true });
  });

  it('never reports negative availability when over the limit', () => {
    expect(seatSummary(members, 1)).toMatchObject({ available: 0, full: true });
  });

  it('treats 0 and undefined as unlimited', () => {
    expect(seatSummary(members, 0)).toEqual({ limit: null, used: 2, available: null, full: false });
    expect(seatSummary(members, undefined).full).toBe(false);
  });
});

describe('validateNewMember', () => {
  const existing = [member({ email: 'taken@x.com' })];

  it('accepts a complete, unused member', () => {
    expect(validateNewMember({ fullName: 'New Person', email: 'new@x.com', role: 'member' }, existing)).toEqual({});
  });

  it('requires an email but not a name (the name is taken from the address)', () => {
    expect(validateNewMember({ fullName: '  ', email: '', role: 'member' }, existing)).toEqual({ email: expect.any(String) });
    expect(validateNewMember({ fullName: '', email: 'new@x.com', role: 'member' }, existing)).toEqual({});
  });

  it('rejects a malformed email', () => {
    expect(validateNewMember({ fullName: 'N', email: 'nope', role: 'member' }, existing).email).toMatch(/valid/);
  });

  it('rejects a duplicate email regardless of case', () => {
    expect(validateNewMember({ fullName: 'N', email: ' TAKEN@x.com ', role: 'member' }, existing).email).toMatch(/already/);
  });
});

describe('nameFromEmail', () => {
  it('turns an address into a readable name', () => {
    expect(nameFromEmail('nina.patel@x.com')).toBe('Nina Patel');
    expect(nameFromEmail('  TOM_wu+ops@x.com ')).toBe('Tom Wu');
    expect(nameFromEmail('priya-sharma2@x.com')).toBe('Priya Sharma');
  });

  it('falls back to the local part when there are no words, and to nothing for no address', () => {
    expect(nameFromEmail('1234@x.com')).toBe('1234');
    expect(nameFromEmail('')).toBe('');
  });
});
