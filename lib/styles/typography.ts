/**
 * Typography — Figma-sourced ramp + code overrides.
 *
 * The raw ramp is generated from Figma into `typography.figma.ts` (do not edit
 * that file). This module is hand-authored: it owns the font-key → CSS-variable
 * map, the code `overrides` layer, and the transform into the CSS-property shape
 * that `generate-tailwind.ts` compiles into `@utility` classes.
 *
 * Why overrides exist: text renders differently in a browser than in Figma
 * (CSS half-leading, `text-box-trim` support, next/font fallback metrics), so a
 * value that's right in Figma is occasionally wrong on the web. Overrides win,
 * and `bun run figma:import` warns whenever one masks a changed Figma value.
 */

import { figmaTypography } from './typography.figma'

// Code-owned: font key → the CSS variable next/font exposes (see fonts.ts).
const fonts = {
  display: '--next-font-display',
  mono: '--next-font-mono',
} as const

type FontKey = keyof typeof fonts
type Responsive<T> = { mobile: T; desktop: T }
type StyleName = keyof typeof figmaTypography

type TypeStyle = {
  family: FontKey
  weight: number
  fontStyle: string
  letterSpacing: string
  leadingTrim: 'NONE' | 'CAP_HEIGHT'
  fontFeatureSettings: string | null
  fontSize: Responsive<number>
  lineHeight: Responsive<string>
}

/**
 * Code overrides — merged over the Figma ramp, per style, per property. Empty
 * means "pure Figma". Example: `{ p: { lineHeight: { mobile: '130%', desktop:
 * '125%' } } }`. Each override is reported on the next `figma:import`.
 */
export const overrides: Partial<Record<StyleName, Partial<TypeStyle>>> = {}

type CssValue = string | number | Responsive<string | number>
type CssStyle = Record<string, CssValue>

const collapse = <T>(r: Responsive<T>): T | Responsive<T> =>
  r.mobile === r.desktop ? r.mobile : r

/** Structured style → CSS-property object (the shape generate-tailwind expects). */
function toCss(style: TypeStyle): CssStyle {
  const css: CssStyle = {
    'font-family': `var(${fonts[style.family]})`,
    'font-style': style.fontStyle,
    'font-weight': style.weight,
    'line-height': collapse(style.lineHeight),
    'letter-spacing': style.letterSpacing,
  }
  // Figma "Vertical trim: Cap height to baseline" → CSS text-box trimming.
  if (style.leadingTrim === 'CAP_HEIGHT') {
    css['text-box-trim'] = 'both'
    css['text-box-edge'] = 'cap alphabetic'
  }
  if (style.fontFeatureSettings)
    css['font-feature-settings'] = style.fontFeatureSettings
  css['font-size'] = style.fontSize
  return css
}

const typography = {} as Record<StyleName, CssStyle>
for (const name of Object.keys(figmaTypography) as StyleName[]) {
  const base = figmaTypography[name] as TypeStyle
  typography[name] = toCss({ ...base, ...(overrides[name] ?? {}) })
}

export { fonts, typography }
