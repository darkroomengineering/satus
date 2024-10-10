// Type declarations
type Color = string

type Colors = {
  black: Color
  white: Color
  red: Color
}

type Theme = {
  primary: Color
  secondary: Color
  contrast: Color
}

type Themes = {
  light: Theme
  dark: Theme
  red: Theme
}

type Breakpoints = {
  dt: number
}

type ScreenSize = {
  width: number
  height: number
}

type Screens = {
  mobile: ScreenSize
  desktop: ScreenSize
}

type Columns = {
  mobile: number
  desktop: number
}

type Gaps = {
  mobile: number
  desktop: number
}

type Margins = {
  mobile: number
  desktop: number
}

type Config = {
  themes: Themes
  columns: Columns
  gaps: Gaps
  margins: Margins
}

// Constant declarations
const colors: Colors = {
  black: '#000000',
  white: '#ffffff',
  red: '#e30613',
}

const themes: Themes = {
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

const breakpoints: Breakpoints = {
  dt: 800,
}

const screens: Screens = {
  mobile: { width: 375, height: 650 },
  desktop: { width: 1440, height: 816 },
}

const themeNames: (keyof Themes)[] = Object.keys(themes) as (keyof Themes)[]

const config: Config = {
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
