const colors = {
  black: '#000000',
  white: '#ffffff',
  red: '#e30613',
} as const

const themeNames = ['light', 'dark', 'red'] as const
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
} as const satisfies Themes

export { colors, themeNames, themes }

// UTIL TYPES
type Themes = Record<
  (typeof themeNames)[number],
  Record<(typeof colorNames)[number], string>
>
