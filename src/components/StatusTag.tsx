import type { ReactNode } from 'react';
import { Tag } from 'antd';
import { lightColors, darkColors } from '../theme/tokens';
import { useMaveraTheme } from '../theme/ThemeProvider';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface StatusTagProps {
  tone: StatusTone;
  children: ReactNode;
}

export function StatusTag({ tone, children }: StatusTagProps) {
  const { mode } = useMaveraTheme();
  const colors = mode === 'dark' ? darkColors : lightColors;
  const textColor = tone === 'neutral' ? colors.textSecondary : colors[tone];

  return (
    <Tag
      bordered
      style={{
        color: textColor,
        borderColor: colors.border,
        background: colors.surfaceSubtle,
      }}
    >
      {children}
    </Tag>
  );
}
