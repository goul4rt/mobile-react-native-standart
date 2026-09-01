/**
 * Tokens from `docs/design/design.md`. Semantic naming: the component asks for
 * `color.primary` and the theme resolves it. Green and red are reserved for
 * right/wrong answers, never decoration.
 */

const light = {
  bg: '#FAFAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F0F5',
  border: '#E4E4EA',
  text: '#1B1B22',
  textSecondary: '#55555F',
  textMuted: '#8A8A94',
  primary: '#6D4AFF',
  primaryPressed: '#5233CC',
  primarySubtle: '#F4F1FF',
  onPrimary: '#FFFFFF',
  success: '#0E9F5B',
  successSubtle: '#EAF9F1',
  successText: '#0B6B3F',
  danger: '#DB3B47',
  dangerSubtle: '#FDEEEF',
  dangerText: '#9C2B34',
  warningSubtle: '#FFF7E8',
  warningText: '#8A6B1F',
};

const dark: typeof light = {
  bg: '#131318',
  surface: '#1D1D26',
  surfaceAlt: '#26262F',
  border: '#2B2B36',
  text: '#EDEDF2',
  textSecondary: '#C9C9D4',
  textMuted: '#8F8F9C',
  primary: '#9B82FF',
  primaryPressed: '#B4A2FF',
  primarySubtle: '#241E3A',
  // Primary button on dark: dark text over light purple (8.6:1 contrast).
  onPrimary: '#1B1B22',
  success: '#3DD68C',
  successSubtle: '#17251D',
  successText: '#3DD68C',
  danger: '#FF7079',
  dangerSubtle: '#2A1B1D',
  dangerText: '#FF7079',
  warningSubtle: '#2E2618',
  warningText: '#E8C36A',
};

export type Palette = typeof light;
export const palettes = { light, dark };

/**
 * Always the PostScript name, never `fontWeight`: the SemiBold faces register
 * their own family ("Lexend SemiBold"), so asking for weight 600 on the base
 * family falls back to Regular on iOS and to synthetic bold on Android.
 */
export const type = {
  display: { fontFamily: 'Lexend-Bold', fontSize: 28, lineHeight: 35 },
  title: { fontFamily: 'Lexend-Bold', fontSize: 24, lineHeight: 31 },
  heading: { fontFamily: 'Lexend-SemiBold', fontSize: 17, lineHeight: 23 },
  label: { fontFamily: 'Lexend-SemiBold', fontSize: 16, lineHeight: 21 },
  /** The app's most important metric: the question statement. */
  body: { fontFamily: 'PublicSans-Regular', fontSize: 16, lineHeight: 26 },
  alternative: { fontFamily: 'PublicSans-Regular', fontSize: 15, lineHeight: 23 },
  caption: { fontFamily: 'PublicSans-Regular', fontSize: 13, lineHeight: 19 },
  micro: { fontFamily: 'PublicSans-Regular', fontSize: 12, lineHeight: 17 },
} as const;

/** Base 4. Side margin 24, card padding 16, gap between sections 40. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, section: 40 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

/** No shadows (entry-level Android): depth comes from border + surface. */
export const border = { normal: 1.5, strong: 2 } as const;

export const TOUCH_TARGET = 44;

/** Filled button height. Used to be hand-written in eight screens. */
export const CONTROL_HEIGHT = 52;
/** Text button: no fill, but still a full touch target. */
export const PLAIN_CONTROL_HEIGHT = TOUCH_TARGET;
