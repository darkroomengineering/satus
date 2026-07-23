// THIS FILE HAS TO STAY .mjs AS ITS CONSUMED BY POSTCSS
/*
 * GENERATED FROM FIGMA VARIABLES — DO NOT EDIT DIRECTLY.
 * Source of truth: Figma variables → figma-tokens.json → bun run figma:import. `breakpoints` below is code-owned and preserved across syncs.
 */
const breakpoints = {
  dt: 800,
}

const screens = {
  mobile: { width: 375, height: 650 },
  desktop: { width: 1440, height: 816 },
}

const layout = {
  // Grid column count. Drives repeat(var(--columns),1fr) and column-based
  // sizing.
  columns: { mobile: 4, desktop: 12 },
  // Grid gutter, in design px at the reference device width. Repo emits it
  // as fluid vw.
  gap: { mobile: 16, desktop: 16 },
  // Outer safe margin (inline), design px. Repo emits it as fluid vw.
  safe: { mobile: 16, desktop: 16 },
}

const customSizes = {
  // Header height, design px. Repo emits it as fluid vw (--header-height).
  'header-height': { mobile: 58, desktop: 98 },
}

export { breakpoints, customSizes, layout, screens }
