// Constant declarations
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

const breakpoints = {
  dt: 800,
}

const screens = {
  mobile: { width: 375, height: 650 },
  desktop: { width: 1440, height: 816 },
}

/** @type {(keyof typeof themes)[]} */
const themeNames = Object.keys(themes)

const config = {
  themes,
  columns: {
    mobile: 4,
    desktop: 8,
  },
  gaps: {
    mobile: 4,
    desktop: 4,
  },
  margins: {
    mobile: 4,
    desktop: 4,
  },
}

export { breakpoints, colors, config, screens, themeNames, themes }
