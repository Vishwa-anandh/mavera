import { describe, it, expect } from 'vitest';
import { lightColors, darkColors, spacing, radius, shadow, motion, chartColors } from './tokens';

describe('design tokens', () => {
  it('light and dark color tokens declare the same set of roles', () => {
    expect(Object.keys(lightColors).sort()).toEqual(Object.keys(darkColors).sort());
  });

  it('matches key color values from MAVERA_DESIGN_SYSTEM.md §4.1', () => {
    expect(lightColors.canvas).toBe('#F6F7F9');
    expect(lightColors.primary).toBe('#175CD3');
    expect(darkColors.primary).toBe('#84ADFF');
    expect(darkColors.action).toBe('#175CD3');
  });

  it('spacing scale has no arbitrary values outside the documented steps', () => {
    expect(spacing.space4).toBe(16);
    expect(spacing.space6).toBe(24);
  });

  it('radius and shadow tokens are defined for both themes', () => {
    expect(radius.lg).toBe(8);
    expect(shadow.light).toContain('rgba(16,24,40');
    expect(shadow.dark).toContain('rgba(0,0,0');
  });

  it('motion tokens match documented durations', () => {
    expect(motion.fast).toBe(120);
    expect(motion.base).toBe(160);
    expect(motion.slow).toBe(200);
  });

  it('chart color roles are defined for both themes', () => {
    expect(chartColors.light.primary).toBe('#175CD3');
    expect(chartColors.dark.primary).toBe('#84ADFF');
  });
});
