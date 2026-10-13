import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveStoredMode } from './resolveInitialTheme';

function mockSystemPrefersDark(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
}

describe('resolveInitialTheme', () => {
  afterEach(() => vi.restoreAllMocks());

  it('an explicit "dark"/"light" choice always wins, regardless of system preference', () => {
    mockSystemPrefersDark(true);
    expect(resolveStoredMode('dark')).toBe('dark');
    expect(resolveStoredMode('light')).toBe('light');
  });

  it('falls back to the system colour-scheme preference when nothing is stored', () => {
    mockSystemPrefersDark(true);
    expect(resolveStoredMode(null)).toBe('dark');
    expect(resolveStoredMode('blue')).toBe('dark');

    mockSystemPrefersDark(false);
    expect(resolveStoredMode(null)).toBe('light');
    expect(resolveStoredMode('blue')).toBe('light');
  });
});
