import { describe, expect, it } from 'vitest';
import { validateEmailAddress } from './emailAddress';

describe('validateEmailAddress', () => {
  it('accepts a plain address, ignoring surrounding spaces', () => {
    expect(validateEmailAddress('  finance@maitsys.com ')).toBeNull();
  });

  it('asks for an address when the field is empty', () => {
    expect(validateEmailAddress('   ')).toBe('Enter an email address.');
  });

  it.each(['finance', 'finance@', '@maitsys.com', 'a b@maitsys.com', 'finance@maitsys', 'finance@maitsys.c'])('rejects %s', (bad) => {
    expect(validateEmailAddress(bad)).toBe('Enter a valid email address, like name@company.com.');
  });

  it('rejects an address already on the list, whatever its case', () => {
    expect(validateEmailAddress('Ops@Maitsys.com', ['ops@maitsys.com'])).toBe('This address is already a recipient.');
    expect(validateEmailAddress('new@maitsys.com', ['ops@maitsys.com'])).toBeNull();
  });
});
