import { describe, expect, it } from 'vitest';
import { chartTint } from './chartTint';
import { chartColors, darkColors, lightColors } from './tokens';

describe('chartTint', () => {
  it('is the colour itself at 1 and the page surface at 0, in each theme', () => {
    expect(chartTint(chartColors.light.primary, 'light', 1).toLowerCase()).toBe(chartColors.light.primary.toLowerCase());
    expect(chartTint(chartColors.light.primary, 'light', 0).toLowerCase()).toBe(lightColors.surface.toLowerCase());
    expect(chartTint(chartColors.dark.primary, 'dark', 0).toLowerCase()).toBe(darkColors.surface.toLowerCase());
  });

  it('lightens a colour towards the surface in light mode and darkens it in dark mode', () => {
    const light = chartTint('#175CD3', 'light', 0.4);
    const dark = chartTint('#84ADFF', 'dark', 0.4);
    expect(parseInt(light.slice(1, 3), 16)).toBeGreaterThan(0x17);
    expect(parseInt(dark.slice(1, 3), 16)).toBeLessThan(0x84);
  });
});
