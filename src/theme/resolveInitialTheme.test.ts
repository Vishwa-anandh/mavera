import { describe, it, expect } from 'vitest';
import { resolveStoredMode, resolveStoredDensity } from './resolveInitialTheme';

describe('resolveInitialTheme', () => {
  it('resolves "dark" to dark and everything else to light', () => {
    expect(resolveStoredMode('dark')).toBe('dark');
    expect(resolveStoredMode('light')).toBe('light');
    expect(resolveStoredMode('blue')).toBe('light');
    expect(resolveStoredMode(null)).toBe('light');
  });

  it('resolves "compact" to compact and everything else to comfortable', () => {
    expect(resolveStoredDensity('compact')).toBe('compact');
    expect(resolveStoredDensity('roomy')).toBe('comfortable');
    expect(resolveStoredDensity(null)).toBe('comfortable');
  });
});
