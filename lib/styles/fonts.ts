import { Oswald, Spline_Sans_Mono } from 'next/font/google'

const display = Oswald({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--next-font-display',
  fallback: ['Arial Narrow', 'Arial', 'sans-serif'],
})

const mono = Spline_Sans_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--next-font-mono',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
})

const fonts = [display, mono]
const fontsVariable = fonts.map((font) => font.variable).join(' ')

export { fontsVariable }
