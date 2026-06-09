import type { CSSProperties } from 'react'

const fonts = {
  display: '--next-font-display',
  mono: '--next-font-mono', // this should be the variable name defined in fonts.ts
} as const

const typography: TypeStyles = {
  h1: {
    'font-family': `var(${fonts.display})`,
    'font-style': 'normal',
    'font-weight': 700,
    'line-height': '80%',
    'letter-spacing': '-0.05em',
    'font-size': { mobile: 72, desktop: 120 },
  },
  h2: {
    'font-family': `var(${fonts.display})`,
    'font-style': 'normal',
    'font-weight': 700,
    'line-height': '80%',
    'letter-spacing': '-0.03em',
    'font-size': { mobile: 32, desktop: 48 },
  },
  'p-big': {
    'font-family': `var(${fonts.mono})`,
    'font-style': 'normal',
    'font-weight': 400,
    'line-height': '125%',
    'letter-spacing': '-0.02em',
    'font-size': { mobile: 16, desktop: 20 },
  },
  p: {
    'font-family': `var(${fonts.mono})`,
    'font-style': 'normal',
    'font-weight': 400,
    'line-height': { mobile: '125%', desktop: '120%' },
    'letter-spacing': '-0.01em',
    'font-size': { mobile: 12, desktop: 14 },
  },
  caption: {
    'font-family': `var(${fonts.mono})`,
    'font-style': 'normal',
    'font-weight': 400,
    'line-height': { mobile: '125%', desktop: '120%' },
    'letter-spacing': '-0.01em',
    'font-size': { mobile: 8, desktop: 10 },
  },
  cta: {
    'font-family': `var(${fonts.mono})`,
    'font-style': 'normal',
    'font-weight': 400,
    'line-height': '100%',
    'letter-spacing': '-0.01em',
    'font-size': { mobile: 12, desktop: 14 },
  },
  link: {
    'font-family': `var(${fonts.mono})`,
    'font-style': 'normal',
    'font-weight': 400,
    'line-height': { mobile: '125%', desktop: '120%' },
    'letter-spacing': '-0.01em',
    'font-size': { mobile: 12, desktop: 14 },
  },
} as const

export { fonts, typography }

// UTIL TYPES
type TypeStyles = Record<
  string,
  {
    'font-family': string
    'font-style': CSSProperties['fontStyle']
    'font-weight': CSSProperties['fontWeight']
    'line-height':
      | `${number}%`
      | { mobile: `${number}%`; desktop: `${number}%` }
    'letter-spacing':
      | `${number}em`
      | { mobile: `${number}em`; desktop: `${number}em` }
    'font-feature-settings'?: string
    'font-size': number | { mobile: number; desktop: number }
  }
>
