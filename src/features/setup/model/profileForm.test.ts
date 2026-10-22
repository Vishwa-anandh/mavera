import { describe, expect, it } from 'vitest';
import { initialsOf, logoFileError, normaliseWebsite, profileDraftOf, profileToSave, sameProfile, validateProfile, type ProfileDraft } from './profileForm';

const good: ProfileDraft = { name: 'Northwind', phone: '+1 555 010 0199', website: 'northwind.com', address: '1 Main St', about: 'We run cloud.', logoDataUrl: null };

describe('validateProfile', () => {
  it('accepts a complete profile and one with only a name', () => {
    expect(validateProfile(good)).toEqual({});
    expect(validateProfile({ ...good, phone: '', website: '', address: '', about: '' })).toEqual({});
  });

  it('requires a name within 80 characters', () => {
    expect(validateProfile({ ...good, name: '  ' }).name).toMatch(/company name/);
    expect(validateProfile({ ...good, name: 'x'.repeat(81) }).name).toMatch(/80/);
  });

  it('checks phone, website and the text limits', () => {
    expect(validateProfile({ ...good, phone: 'call me' }).phone).toBeDefined();
    expect(validateProfile({ ...good, phone: '12345' }).phone).toBeDefined();
    expect(validateProfile({ ...good, website: 'not a site' }).website).toBeDefined();
    expect(validateProfile({ ...good, website: 'https://northwind.example/path' }).website).toBeUndefined();
    expect(validateProfile({ ...good, address: 'x'.repeat(201) }).address).toMatch(/200/);
    expect(validateProfile({ ...good, about: 'x'.repeat(501) }).about).toMatch(/500/);
  });
});

describe('helpers', () => {
  it('prefixes bare web addresses with https://', () => {
    expect(normaliseWebsite('northwind.com')).toBe('https://northwind.com');
    expect(normaliseWebsite('http://a.io')).toBe('http://a.io');
    expect(normaliseWebsite('')).toBe('');
    expect(profileToSave(good).website).toBe('https://northwind.com');
  });

  it('starts from the saved profile, or the sign-in organisation name', () => {
    const blank = { name: '', phone: '', website: '', address: '', about: '', logoDataUrl: null, savedAt: null };
    expect(profileDraftOf(blank, 'Northwind (new)').name).toBe('Northwind (new)');
    expect(profileDraftOf({ ...blank, name: 'Saved' }, 'Northwind').name).toBe('Saved');
  });

  it('compares drafts ignoring surrounding spaces and the https prefix', () => {
    expect(sameProfile(good, { ...good, name: ' Northwind ', website: 'https://northwind.com' })).toBe(true);
    expect(sameProfile(good, { ...good, about: 'Other' })).toBe(false);
  });

  it('rejects logos of the wrong type or size', () => {
    expect(logoFileError({ type: 'image/png', size: 1000 })).toBeNull();
    expect(logoFileError({ type: 'application/pdf', size: 1000 })).toMatch(/PNG/);
    expect(logoFileError({ type: 'image/png', size: 600 * 1024 })).toMatch(/512 KB/);
  });

  it('makes initials without the bracketed note', () => {
    expect(initialsOf('Northwind (new organisation)')).toBe('N');
    expect(initialsOf('Maitsys Demo Org')).toBe('MD');
  });
});
