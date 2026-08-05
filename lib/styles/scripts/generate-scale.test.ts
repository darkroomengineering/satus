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

import { generateScale } from './generate-scale'

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
    while (peek() === '*') {
      i++
      value *= parseFactor()
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
