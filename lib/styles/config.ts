import { colors, themeNames, themes } from './colors'
import { breakpoints, customSizes, layout, screens } from './layout.mjs'
import { durations } from './motion'
import { fonts, typography } from './typography'

const config = {
  colors,
  fonts,
  themeNames,
  themes,
  breakpoints,
  customSizes,
  layout,
  screens,
  typography,
  durations,
} as const

export {
  breakpoints,
  colors,
  customSizes,
  durations,
  fonts,
  layout,
  screens,
  themeNames,
  themes,
  typography,
}
export type ThemeName = keyof typeof themes
export type Config = typeof config
