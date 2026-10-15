export interface ColorTokens {
  canvas: string;
  surface: string;
  surfaceSubtle: string;
  surfaceHover: string;
  surfacePressed: string;
  elevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  border: string;
  borderControl: string;
  divider: string;
  primary: string;
  primaryHover: string;
  primaryActive: string;
  action: string;
  actionHover: string;
  actionActive: string;
  onAction: string;
  onPrimary: string;
  selected: string;
  focus: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  scrim: string;
}

export const lightColors: ColorTokens = {
  canvas: '#F4F7FC',
  surface: '#FBFCFF',
  surfaceSubtle: '#F0F5FF',
  surfaceHover: '#E8F0FC',
  surfacePressed: '#DDE9F8',
  elevated: '#FFFFFF',
  text: '#182230',
  textSecondary: '#475467',
  textMuted: '#596579',
  textDisabled: '#7C8798',
  border: '#D6DFEF',
  borderControl: '#71819A',
  divider: '#E1E8F4',
  primary: '#175CD3',
  primaryHover: '#1849A9',
  primaryActive: '#194185',
  action: '#175CD3',
  actionHover: '#1849A9',
  actionActive: '#194185',
  onAction: '#FFFFFF',
  onPrimary: '#FFFFFF',
  selected: '#E5EFFF',
  focus: '#175CD3',
  success: '#056B40',
  warning: '#8A4B08',
  danger: '#B42318',
  info: '#175CD3',
  scrim: 'rgba(16,24,40,.40)',
};

export const darkColors: ColorTokens = {
  canvas: '#121826',
  surface: '#1A2334',
  surfaceSubtle: '#253147',
  surfaceHover: '#2E3C55',
  surfacePressed: '#394A67',
  elevated: '#202C40',
  text: '#F2F4F7',
  textSecondary: '#C9D4E4',
  textMuted: '#AEBBCD',
  textDisabled: '#7D8CA3',
  border: '#41506A',
  borderControl: '#7D8CA3',
  divider: '#34425A',
  primary: '#84ADFF',
  primaryHover: '#A4C2FF',
  primaryActive: '#C7D7FE',
  action: '#175CD3',
  actionHover: '#1849A9',
  actionActive: '#194185',
  onAction: '#FFFFFF',
  onPrimary: '#111318',
  selected: '#293E66',
  focus: '#84ADFF',
  success: '#75E0A7',
  warning: '#FEC84B',
  danger: '#FDA29B',
  info: '#84ADFF',
  scrim: 'rgba(0,0,0,.64)',
};

export const spacing = {
  space0: 0,
  space1: 4,
  space2: 8,
  space3: 12,
  space4: 16,
  space5: 20,
  space6: 24,
  space8: 32,
  space10: 40,
  space12: 48,
  space16: 64,
} as const;

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
} as const;

export const shadow = {
  light: '0 8px 24px rgba(16,24,40,.12), 0 2px 6px rgba(16,24,40,.06)',
  dark: '0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.24)',
} as const;

export const motion = {
  fast: 120,
  base: 160,
  slow: 200,
  exit: 120,
  easeStandard: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

interface ChartColorRoles {
  primary: string;
  secondary: string;
  tertiary: string;
  grid: string;
  axis: string;
}

export const chartColors: { light: ChartColorRoles; dark: ChartColorRoles } = {
  light: {
    primary: '#175CD3',
    secondary: '#475467',
    tertiary: '#527AA3',
    grid: '#E7EBF0',
    axis: '#596579',
  },
  dark: {
    primary: '#84ADFF',
    secondary: '#D0D5DD',
    tertiary: '#74B9C7',
    grid: '#303846',
    axis: '#A4B0C2',
  },
};
