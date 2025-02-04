const colors = {
  black: '#000000',
  white: '#ffffff',
  red: '#e30613',
}

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

const themeNames = Object.keys(themes)

export { colors, themeNames, themes }
