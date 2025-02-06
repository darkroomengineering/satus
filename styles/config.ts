import { colors, themeNames, themes } from './colors'
import { easings } from './easings'
import { breakpoints, headerHeight, layout, screens } from './layout.mjs'
import { fonts, typography } from './typography'

const config = {
  colors,
  fonts,
  themeNames,
  themes,
  easings,
  breakpoints,
  headerHeight,
  layout,
  screens,
  typography,
} as const

export {
  breakpoints,
  colors,
  easings,
  fonts,
  headerHeight,
  layout,
  screens,
  themeNames,
  themes,
  typography,
}
export type Theme = keyof typeof themes
export type Config = typeof config
