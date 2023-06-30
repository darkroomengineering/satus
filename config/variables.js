const colors = {
  black: '#000000',
  white: '#ffffff',
}

const themes = {
  light: {
    primary: colors.white,
    secondary: colors.black,
  },
  dark: {
    primary: colors.black,
    secondary: colors.white,
  },
}

const breakpoints = {
  mobile: '800px',
}

const viewports = {
  mobile: {
    width: '375px',
    height: '650px',
  },
  desktop: {
    width: '1440px',
    height: '816px',
  },
}

module.exports = {
  colors,
  themes,
  breakpoints,
  viewports,
}
