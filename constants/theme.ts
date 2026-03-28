/**
 * Design tokens for the Countdown App.
 * Colors, spacing, typography, and radius scales.
 */

import { Platform } from 'react-native';

// ─── Navigation theme colours ────────────────────────────────────────────────
const tintColorLight = '#6C63FF';
const tintColorDark  = '#A89BFF';

export const Colors = {
  light: {
    text:            '#11181C',
    background:      '#F5F5FA',
    tint:            tintColorLight,
    icon:            '#687076',
    tabIconDefault:  '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text:            '#ECEDEE',
    background:      '#0D0D1A',
    tint:            tintColorDark,
    icon:            '#9BA1A6',
    tabIconDefault:  '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

// ─── App-wide dark UI palette ─────────────────────────────────────────────────
export const DarkAppColors = {
  bg:          '#0D0D1A',
  surface:     '#16162A',
  surfaceAlt:  '#1E1E38',
  border:      'rgba(255,255,255,0.08)',
  text:        '#F0F0FF',
  textMuted:   '#8888AA',
  accent:      '#6C63FF',
  accentLight: '#A89BFF',
};

export const LightAppColors = {
  bg:          '#F4F4F9',
  surface:     '#FFFFFF',
  surfaceAlt:  '#EAEAF2',
  border:      'rgba(0,0,0,0.08)',
  text:        '#11181C',
  textMuted:   '#687076',
  accent:      '#6C63FF',
  accentLight: '#A89BFF',
};

// Alias for backwards compatibility during refactor
export const AppColors = DarkAppColors;

// ─── Category card colours ────────────────────────────────────────────────────
export const CategoryColors = {
  personal: '#FF6B6B',
  work:     '#4ECDC4',
  birthday: '#FFE66D',
  travel:   '#6C63FF',
  other:    '#A8E6CF',
} as const;

// ─── Spacing scale ────────────────────────────────────────────────────────────
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

// ─── Border radius scale ──────────────────────────────────────────────────────
export const Radius = {
  sm:   8,
  md:   12,
  lg:   20,
  xl:   28,
  full: 999,
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
