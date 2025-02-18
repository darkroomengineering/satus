import type { CSSProperties } from 'react'

const fonts = {
  mono: '--font-mono',
} as const

const typography: TypeStyles = {
  'test-mono': {
    'font-family': `var(${fonts.mono})`,
    'font-style': 'normal',
    'font-weight': 400,
    'line-height': '90%',
    'letter-spacing': '0%',
    'font-size': { mobile: 20, desktop: 24 },
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
    'line-height': `${number}%`
    'letter-spacing': `${number}%`
    'font-size': number | { mobile: number; desktop: number }
  }
>
