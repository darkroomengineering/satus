/*
 * GENERATED FROM FIGMA VARIABLES — DO NOT EDIT DIRECTLY.
 * Source of truth: Figma variables → figma-tokens.json → bun run figma:import.
 */

const colors = {
  black: 'oklch(0 0 0)',
  white: 'oklch(1 0 0)',
  // L tuned to 0.592 so red clears WCAG AA (4.5:1) as text on BOTH black and
  // white — a single hue can only do that in a narrow band peaking at
  // 4.583:1, so almost no slack. Check lib/styles/scripts/contrast.test.ts
  // before changing.
  red: 'oklch(0.592 0.2339 27.95)',
  blue: 'oklch(0.5731 0.2145 258.25)',
  green: 'oklch(0.8763 0.2278 152.55)',
} as const

const themeNames = ['light', 'dark', 'red', 'evil'] as const
const colorNames = ['primary', 'secondary', 'contrast'] as const

const themes = {
  light: {
    primary: colors.white,
    secondary: colors.black,
    contrast: colors.red,
  },
  dark: {
    primary: colors.black,
    secondary: colors.white,
    contrast: colors.red,
  },
  red: {
    primary: colors.red,
    secondary: colors.black,
    contrast: colors.white,
  },
  evil: {
    primary: colors.black,
    secondary: colors.red,
    contrast: colors.white,
  },
} as const satisfies Themes

export { colors, themeNames, themes }

// UTIL TYPES
export type Themes = Record<
  (typeof themeNames)[number],
  Record<(typeof colorNames)[number], string>
>
