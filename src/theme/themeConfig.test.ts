import { describe, it, expect } from 'vitest';
import { theme as antdTheme } from 'antd';
import { buildThemeConfig } from './themeConfig';
import { lightColors, darkColors } from './tokens';

describe('buildThemeConfig', () => {
  it('maps light tokens onto AntD seed tokens', () => {
    const config = buildThemeConfig('light', 'comfortable');
    expect(config.token?.colorPrimary).toBe(lightColors.primary);
    expect(config.token?.colorBgLayout).toBe(lightColors.canvas);
  });

  it('maps dark tokens explicitly rather than relying on algorithmic inversion', () => {
    const config = buildThemeConfig('dark', 'comfortable');
    expect(config.token?.colorPrimary).toBe(darkColors.primary);
    expect(config.token?.colorBgLayout).toBe(darkColors.canvas);
  });

  it('uses the dark algorithm only in dark mode', () => {
    const light = buildThemeConfig('light', 'comfortable');
    const dark = buildThemeConfig('dark', 'comfortable');
    expect(light.algorithm).toContain(antdTheme.defaultAlgorithm);
    expect(dark.algorithm).toContain(antdTheme.darkAlgorithm);
  });

  it('adds the compact algorithm only when density is compact', () => {
    const comfortable = buildThemeConfig('light', 'comfortable');
    const compact = buildThemeConfig('light', 'compact');
    expect(comfortable.algorithm).not.toContain(antdTheme.compactAlgorithm);
    expect(compact.algorithm).toContain(antdTheme.compactAlgorithm);
  });

  it('drives the Layout header background from the surface token in both modes', () => {
    expect(buildThemeConfig('light').components?.Layout?.headerBg).toBe(lightColors.surface);
    expect(buildThemeConfig('dark').components?.Layout?.headerBg).toBe(darkColors.surface);
    expect(buildThemeConfig('dark').components?.Layout?.headerColor).toBe(darkColors.text);
  });
});
