import { Oswald, Spline_Sans_Mono } from 'next/font/google'

// No `weight` — both families ship a variable `wght` axis (Oswald 200–700,
// Spline Sans Mono 300–700), so one file per family covers every weight the
// styles use. Pinning explicit weights would download a separate static file
// each and snap in-between weights (500, 600) to the nearest loaded one.
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
