import { theme as antdTheme, type ThemeConfig } from 'antd';
import { lightColors, darkColors, radius } from './tokens';
import type { ThemeMode, Density } from './resolveInitialTheme';

export function buildThemeConfig(mode: ThemeMode, density: Density = 'comfortable'): ThemeConfig {
  const colors = mode === 'dark' ? darkColors : lightColors;
  const baseAlgorithm = mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;
  const algorithm = density === 'compact' ? [baseAlgorithm, antdTheme.compactAlgorithm] : [baseAlgorithm];

  return {
    algorithm,
    token: {
      colorPrimary: colors.primary,
      colorLink: colors.primary,
      colorBgBase: colors.canvas,
      colorBgLayout: colors.canvas,
      colorBgContainer: colors.surface,
      colorBgElevated: colors.elevated,
      colorText: colors.text,
      colorTextSecondary: colors.textSecondary,
      colorTextTertiary: colors.textMuted,
      colorTextDisabled: colors.textDisabled,
      colorBorder: colors.border,
      colorBorderSecondary: colors.divider,
      colorSuccess: colors.success,
      colorWarning: colors.warning,
      colorError: colors.danger,
      colorInfo: colors.info,
      borderRadius: radius.md,
      borderRadiusLG: radius.lg,
      borderRadiusSM: radius.sm,
      fontFamily: 'var(--mv-font-body)',
    },
    components: {
      // AntD's Layout.Header defaults to a fixed dark navy (#001529) in both
      // modes; drive it from Mavera's surface token instead.
      Layout: {
        headerBg: colors.surface,
        headerColor: colors.text,
        bodyBg: colors.canvas,
        footerBg: colors.canvas,
      },
      // The horizontal module menu sits in the header; keep it on the same surface.
      Menu: {
        itemBg: colors.surface,
        horizontalItemSelectedColor: colors.primary,
      },
    },
  };
}
