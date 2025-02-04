// SITE STYLE CONFIG

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

/**
 * Breakpoints for responsive design.
 * @type {{dt: number}}
 */
const breakpoints = {
  dt: 800,
}

/**
 * Screen sizes for responsive design.
 * @type {{mobile: {width: number, height: number}, desktop: {width: number, height: number}}}
 */
const screens = {
  mobile: { width: 375, height: 650 },
  desktop: { width: 1440, height: 816 },
}

/**
 * Layout spacing for grid, gaps, padding, margin, etc.
 * @type {{columns: [number, number], gap: [number, number], space: [number, number]}}
 */
const layout = {
  columns: [4, 12],
  gap: [16, 16],
  space: [16, 16],
}

/**
 * Header height.
 * @type {[number, number]}
 */
const headerHeight = [58, 98]

/**
 * Easing functions.
 * @type {Record<string, string>}
 */
const easings = {
  'in-quad': 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  'in-cubic': 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  'in-quart': 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
  'in-quint': 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
  'in-expo': 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
  'in-circ': 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
  'out-quad': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  'out-cubic': 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  'out-quart': 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  'out-quint': 'cubic-bezier(0.23, 1, 0.32, 1)',
  'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
  'out-circ': 'cubic-bezier(0.075, 0.82, 0.165, 1)',
  'in-out-quad': 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
  'in-out-cubic': 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  'in-out-quart': 'cubic-bezier(0.77, 0, 0.175, 1)',
  'in-out-quint': 'cubic-bezier(0.86, 0, 0.07, 1)',
  'in-out-expo': 'cubic-bezier(1, 0, 0, 1)',
  'in-out-circ': 'cubic-bezier(0.785, 0.135, 0.15, 0.86)',
  gleasing: 'cubic-bezier(0.4, 0, 0, 1)',
}

import { typeStyles } from './typography.mjs'
export {
  breakpoints,
  colors,
  easings,
  headerHeight,
  layout,
  screens,
  themeNames,
  themes,
  typeStyles,
}
