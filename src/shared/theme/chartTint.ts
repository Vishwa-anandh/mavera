import { darkColors, lightColors } from './tokens';

type Mode = 'light' | 'dark';

function parse(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16)) as [number, number, number];
}

/**
 * A lighter tint of a chart colour: `amount` is how much of the colour is kept, the rest is the page surface of the
 * theme. Tints stay inside the design system's three chart roles (forecast bars, the "Other" slice, a fourth donut slice)
 * instead of adding new hues, and they keep a clear step from the surface in both themes.
 */
export function chartTint(hex: string, mode: Mode, amount: number): string {
  const surface = parse((mode === 'dark' ? darkColors : lightColors).surface);
  const base = parse(hex);
  const mixed = base.map((channel, index) => Math.round(channel * amount + surface[index] * (1 - amount)));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
