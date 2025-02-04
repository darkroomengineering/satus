/**
 * Colors.
 * @type {Record<string, string>}
 */
const colors = {
  black: '#000000',
  white: '#ffffff',
  red: '#e30613',
}

/**
 * Themes.
 * @type {Record<string, Record<string, string>>}
 */
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
}

/**
 * Theme names.
 * @type {(keyof typeof themes)[]}
 */
const themeNames = Object.keys(themes)

export { colors, themeNames, themes }
