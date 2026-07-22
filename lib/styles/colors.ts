const colors = {
  black: 'oklch(0 0 0)',
  white: 'oklch(1 0 0)',
  red: 'oklch(0.577 0.2339 27.95)',
  blue: 'oklch(0.5731 0.2145 258.25)',
  green: 'oklch(0.8763 0.2278 152.55)',
  purple: 'oklch(0.4907 0.2275 300.45)',
  pink: 'oklch(0.6453 0.2603 2.47)',
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
  evil: {
    primary: colors.black,
    secondary: colors.red,
    contrast: colors.white,
  },
  red: {
    primary: colors.red,
    secondary: colors.black,
    contrast: colors.white,
  },
} as const satisfies Themes

export { colors, themeNames, themes }

// UTIL TYPES
export type Themes = Record<
  (typeof themeNames)[number],
  Record<(typeof colorNames)[number], string>
>
