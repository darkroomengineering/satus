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
 * @type {{mobile: number, desktop: number}}
 */
const headerHeight = {
  mobile: 58,
  desktop: 98,
}

export { breakpoints, headerHeight, layout, screens }
