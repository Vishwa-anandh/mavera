import { describe, it, expect } from 'vitest';
import html from '../../index.html?raw';
import { darkColors, lightColors, type ColorTokens } from './tokens';

function block(selector: string): string {
  const start = html.indexOf(selector);
  if (start === -1) throw new Error(`${selector} not found in index.html`);
  return html.slice(start, html.indexOf('}', start));
}

function declarations(css: string): Record<string, string> {
  return Object.fromEntries([...css.matchAll(/--mv-([a-z-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function tokenFor(colors: ColorTokens, cssName: string): string {
  const key = cssName.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()) as keyof ColorTokens;
  return colors[key];
}

describe('index.html pre-paint theme tokens', () => {
  it('keys dark-mode colours off [data-theme="dark"] with the same values as darkColors', () => {
    const vars = declarations(block(":root[data-theme='dark']"));
    expect(Object.keys(vars)).toEqual(expect.arrayContaining(['canvas', 'surface', 'text']));
    Object.entries(vars).forEach(([name, value]) => expect(value).toBe(tokenFor(darkColors, name)));
  });

  it('defines light-mode defaults with the same values as lightColors', () => {
    const vars = declarations(block(":root[data-theme='light']"));
    expect(Object.keys(vars)).toEqual(expect.arrayContaining(['canvas', 'surface', 'text']));
    Object.entries(vars).forEach(([name, value]) => expect(value).toBe(tokenFor(lightColors, name)));
  });
});
