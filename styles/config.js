const colors = {
  black: '#000000',
  white: '#ffffff',
  green: '#00ff6a',
}

const themes = {
  light: {
    primary: colors.white,
    secondary: colors.black,
    contrast: colors.green,
  },
  dark: {
    primary: colors.black,
    secondary: colors.white,
    contrast: colors.green,
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

// function getCSSColors() {
//   return Object.entries(colors).reduce(
//     (acc, [key, value]) => acc + `--${key}: ${value};`,
//     '',
//   )
// }

// function getCSSThemes() {
//   return Object.entries(themes).reduce(
//     (acc, [key, colors]) =>
//       acc +
//       `.theme-${key}:{${Object.entries(colors).reduce(
//         (acc, [key, value]) => acc + `--${key}: ${value};`,
//         '',
//       )}}`,
//     '',
//   )
// }

// export function getStyle() {
//   return `:root{${getCSSColors()}}${getCSSThemes()}`
// }

module.exports = { breakpoints, colors, themes, viewports }
