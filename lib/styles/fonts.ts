import { Oswald, Spline_Sans_Mono } from 'next/font/google'

// No `weight`: both families ship a variable `wght` axis (Oswald 200–700,
// Spline Sans Mono 300–700), so one file each covers every weight. Pinned
// weights would download a static file per weight and snap in-between ones.
// Both are above the fold, so the default preload is right; a below-fold
// family sets `preload: false` (AGENTS.md § Fonts).
const display = Oswald({
  subsets: ['latin'],
  display: 'swap',
  variable: '--next-font-display',
  fallback: ['Arial Narrow', 'Arial', 'sans-serif'],
})

const mono = Spline_Sans_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--next-font-mono',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
})

const fonts = [display, mono]
const fontsVariable = fonts.map((font) => font.variable).join(' ')

export { fontsVariable }
