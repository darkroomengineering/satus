/**
 * Regression tests for issue #394: the column-utility CSS generator was
 * broken two ways —
 *
 * (a) the `dr-*-col-value` autocomplete variants hardcoded the literal JS
 *     string `'value'` into the CSS body (`calc((value * ...))`), which is
 *     invalid CSS and silently dropped. That variant earned nothing (no call
 *     site ever referenced a `-col-value` class), so it was removed outright
 *     rather than patched.
 * (b) the negative wildcard utilities (`-dr-w-col-*`) negated only the
 *     column term, leaving the gap term unnegated — wrong by
 *     `2 * (N - 1) * gap` for every N >= 2.
 *
 * Run with: bun test lib/styles/scripts/generate-scale.test.ts
 */

import { describe, expect, it } from 'bun:test'

import {
  breakpoints,
  colors,
  customSizes,
  fonts,
  themes,
  typography,
} from '../config'
import { screens, textRemShare } from '../layout.mjs'
import { generateScale } from './generate-scale'
import { generateTailwind } from './generate-tailwind'
import { textCalc } from './utils'

function getUtilityBody(css: string, utilityHeader: string): string {
  const marker = `@utility ${utilityHeader} {`
  const start = css.indexOf(marker)
  if (start === -1) {
    throw new Error(`utility not found in generated CSS: ${utilityHeader}`)
  }
  const bodyStart = start + marker.length
  const bodyEnd = css.indexOf('}', bodyStart)
  return css.slice(bodyStart, bodyEnd).trim()
}

function getDeclarationValue(body: string, property: string): string {
  const marker = `${property}:`
  const start = body.indexOf(marker)
  if (start === -1) {
    throw new Error(`property not found in utility body: ${property}`)
  }
  const valueStart = start + marker.length
  const valueEnd = body.indexOf(';', valueStart)
  return body.slice(valueStart, valueEnd).trim()
}

// Minimal recursive-descent arithmetic evaluator (+, -, *, parens, negative
// numbers) — no `Function`/`eval`, just enough to evaluate the `calc()`
// bodies this generator emits once their CSS tokens are substituted for
// numbers.
function evalArithmetic(expr: string): number {
  let i = 0

  const peek = () => expr[i] ?? ''
  const skipSpace = () => {
    while (peek() === ' ') i++
  }

  function parseNumber(): number {
    skipSpace()
    const start = i
    if (peek() === '-') i++
    while (/[0-9.]/.test(peek())) i++
    const text = expr.slice(start, i)
    const n = Number.parseFloat(text)
    if (Number.isNaN(n)) {
      throw new Error(`Invalid number at index ${start}: "${text}"`)
    }
    return n
  }

  function parseFactor(): number {
    skipSpace()
    if (peek() === '(') {
      i++
      const value = parseExpr()
      skipSpace()
      if (peek() !== ')') throw new Error('Expected ")"')
      i++
      return value
    }
    if (peek() === '-') {
      i++
      return -parseFactor()
    }
    return parseNumber()
  }

  function parseTerm(): number {
    let value = parseFactor()
    skipSpace()
    while (peek() === '*' || peek() === '/') {
      const op = peek()
      i++
      const rhs = parseFactor()
      value = op === '*' ? value * rhs : value / rhs
      skipSpace()
    }
    return value
  }

  function parseExpr(): number {
    let value = parseTerm()
    skipSpace()
    while (peek() === '+' || peek() === '-') {
      const op = peek()
      i++
      const rhs = parseTerm()
      value = op === '+' ? value + rhs : value - rhs
      skipSpace()
    }
    return value
  }

  const result = parseExpr()
  skipSpace()
  if (i !== expr.length) {
    throw new Error(`Unexpected trailing input: "${expr.slice(i)}"`)
  }
  return result
}

// Evaluates a generated `calc()` expression as plain arithmetic by
// substituting `--value(integer)`, `var(--column-width)`, and `var(--gap)`
// with concrete numbers, then rewriting `calc(` to `(` (their parens already
// balance, so the result is a valid arithmetic expression).
function evalCalcExpression(
  expr: string,
  value: number,
  columnWidth: number,
  gap: number
): number {
  const arithmeticExpr = expr
    .replaceAll('--value(integer)', String(value))
    .replaceAll('var(--column-width)', String(columnWidth))
    .replaceAll('var(--gap)', String(gap))
    .replaceAll('calc(', '(')

  return evalArithmetic(arithmeticExpr)
}

describe('generateScale column utilities', () => {
  const css = generateScale()

  it('emits -dr-w-col-* as the exact negation of dr-w-col-*', () => {
    const positiveBody = getUtilityBody(css, 'dr-w-col-*')
    const negativeBody = getUtilityBody(css, '-dr-w-col-*')

    const positiveExpr = getDeclarationValue(positiveBody, 'width')
    const negativeExpr = getDeclarationValue(negativeBody, 'width')

    for (const n of [1, 2, 3, 5, 8]) {
      const positiveValue = evalCalcExpression(positiveExpr, n, 37, 11)
      const negativeValue = evalCalcExpression(negativeExpr, n, 37, 11)
      expect(negativeValue).toBe(-positiveValue)
    }
  })

  it('never emits the invalid literal-`value` autocomplete utility', () => {
    expect(css).not.toContain('col-value')
    expect(css).not.toContain('(value *')
    expect(css).not.toContain('(-value *')
  })
})

// Evaluates a generated font-size expression in CSS pixels for a viewport that
// is `viewportWidth` CSS px wide, a root font size of `rootPx`, and a frame of
// `deviceWidth`. Units resolve as rem = rootPx, 1vw = viewportWidth / 100.
function evalFontSize(
  expr: string,
  {
    value,
    deviceWidth,
    viewportWidth,
    rootPx = 16,
  }: {
    value?: number
    deviceWidth: number
    viewportWidth: number
    rootPx?: number
  }
): number {
  let arithmetic = expr
    .replaceAll('var(--device-width)', String(deviceWidth))
    .replaceAll('calc(', '(')
    .replace(/(-?[0-9.]+)rem/g, (_, n: string) => `(${n} * ${rootPx})`)
    .replace(
      /(-?[0-9.]+)vw/g,
      (_, n: string) => `(${n} * ${viewportWidth / 100})`
    )
  if (value !== undefined) {
    arithmetic = arithmetic.replaceAll('--value(integer)', String(value))
  }
  return evalArithmetic(arithmetic)
}

describe('text sizing is rem plus vw', () => {
  const frames = [
    { name: 'mobile', width: screens.mobile.width },
    { name: 'desktop', width: screens.desktop.width },
  ]

  it('uses a rem share strictly between 0 and 1', () => {
    expect(textRemShare).toBeGreaterThan(0)
    expect(textRemShare).toBeLessThan(1)
  })

  for (const { name, width } of frames) {
    it(`resolves to exactly X px at the ${name} frame width with a 16px root`, () => {
      for (const x of [12, 14, 16, 32, 48, 72, 120]) {
        const px = evalFontSize(textCalc(x), {
          deviceWidth: width,
          viewportWidth: width,
        })
        expect(px).toBeCloseTo(x, 9)
      }
    })

    it(`emits dr-text-* that resolves to exactly X px at the ${name} frame width`, () => {
      const body = getUtilityBody(generateScale(), 'dr-text-*')
      const expr = getDeclarationValue(body, 'font-size')
      for (const x of [1, 12, 24, 100]) {
        const px = evalFontSize(expr, {
          value: x,
          deviceWidth: width,
          viewportWidth: width,
        })
        expect(px).toBeCloseTo(x, 9)
      }
    })

    it(`emits dr-text-px as 1px at the ${name} frame width`, () => {
      const body = getUtilityBody(generateScale(), 'dr-text-px')
      const expr = getDeclarationValue(body, 'font-size')
      const px = evalFontSize(expr, {
        deviceWidth: width,
        viewportWidth: width,
      })
      expect(px).toBeCloseTo(1, 9)
    })
  }

  it('emits -dr-text-* as the exact negation of dr-text-*', () => {
    const css = generateScale()
    const pos = getDeclarationValue(
      getUtilityBody(css, 'dr-text-*'),
      'font-size'
    )
    const neg = getDeclarationValue(
      getUtilityBody(css, '-dr-text-*'),
      'font-size'
    )
    const ctx = { value: 24, deviceWidth: 1440, viewportWidth: 1000 }
    expect(evalFontSize(neg, ctx)).toBeCloseTo(-evalFontSize(pos, ctx), 9)
  })

  it('grows with the root font size, so text follows the user setting', () => {
    const expr = textCalc(16)
    const ctx = { deviceWidth: 1440, viewportWidth: 1440 }
    const at16 = evalFontSize(expr, { ...ctx, rootPx: 16 })
    const at24 = evalFontSize(expr, { ...ctx, rootPx: 24 })
    expect(at24).toBeGreaterThan(at16)
  })

  it('keeps the rem term out of layout utilities', () => {
    const css = generateScale()
    for (const name of ['dr-w-*', 'dr-p-*', 'dr-gap-*', 'dr-tracking-*']) {
      expect(getUtilityBody(css, name)).not.toContain('rem')
    }
  })

  it('applies the two-band typography as rem plus vw per band', () => {
    const css = generateTailwind({
      breakpoints,
      colors,
      customSizes,
      fonts,
      themes,
      typography,
    })
    const h1 = css.slice(css.indexOf('@utility h1 {'))
    const body = h1.slice(0, h1.indexOf('\n}'))
    const [mobile, desktop] = [
      ...body.matchAll(/font-size: (calc\(.*?\));/g),
    ].map((m) => m[1] ?? '')
    expect(
      evalFontSize(mobile ?? '', { deviceWidth: 375, viewportWidth: 375 })
    ).toBeCloseTo(72, 9)
    expect(
      evalFontSize(desktop ?? '', { deviceWidth: 1440, viewportWidth: 1440 })
    ).toBeCloseTo(120, 9)
  })
})
