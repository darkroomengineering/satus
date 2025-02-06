// THIS FILE HAS TO STAY .mjs AS ITS CONSUMED BY POSTCSS
const breakpoints = {
  dt: 800,
}

const screens = {
  mobile: { width: 375, height: 650 },
  desktop: { width: 1440, height: 816 },
}

const layout = {
  columns: { mobile: 4, desktop: 12 },
  gap: { mobile: 16, desktop: 16 },
  space: { mobile: 16, desktop: 16 },
}

const headerHeight = {
  mobile: 58,
  desktop: 98,
}

export { breakpoints, headerHeight, layout, screens }
