// THIS FILE HAS TO STAY .mjs AS ITS CONSUMED BY POSTCSS
const breakpoints = {
  dt: 800,
}

const screens = {
  mobile: { width: 375, height: 650 },
  desktop: { width: 1440, height: 816 },
}

// Share of every font-size that resolves in rem; the rest scales with the
// viewport (vw). The rem share is what makes text follow browser zoom and the
// user's default font size (WCAG 1.4.4). Pure vw text does not: zooming shrinks
// the CSS viewport, so vw sizes stay put. At the frame width with a 16px root
// the two terms still sum to the Figma size, so the design is unchanged there.
// Raise it for more zoom response and less layout-tracking; lower it for the
// reverse. Must stay in (0, 1).
const textRemShare = 0.5

const layout = {
  columns: { mobile: 4, desktop: 12 },
  gap: { mobile: 16, desktop: 16 },
  safe: { mobile: 16, desktop: 16 },
}

const customSizes = {
  'header-height': { mobile: 58, desktop: 98 },
}

export { breakpoints, customSizes, layout, screens, textRemShare }
