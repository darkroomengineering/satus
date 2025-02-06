const fonts = {
  mono: '--font-mono',
} as const

const typography = {
  'test-mono': {
    'font-family': fonts.mono,
    'font-style': 'normal',
    'font-weight': 400,
    'line-height': '90%',
    'letter-spacing': 0,
    'font-size': 20,
  },
} as const

export { fonts, typography }
