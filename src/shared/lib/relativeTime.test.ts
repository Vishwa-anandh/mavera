import { describe, it, expect } from 'vitest';
import { relativeTime } from './relativeTime';

const now = new Date('2026-10-15T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);

describe('relativeTime', () => {
  it('says just now under a minute', () => expect(relativeTime(ago(20_000), now)).toBe('just now'));

  it('uses singular and plural minutes', () => {
    expect(relativeTime(ago(60_000), now)).toBe('1 minute ago');
    expect(relativeTime(ago(5 * 60_000), now)).toBe('5 minutes ago');
  });

  it('switches to hours and days', () => {
    expect(relativeTime(ago(2 * 3_600_000), now)).toBe('2 hours ago');
    expect(relativeTime(ago(3 * 86_400_000), now)).toBe('3 days ago');
  });
});
