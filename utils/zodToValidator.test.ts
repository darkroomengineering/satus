/**
 * Unit tests for zodToValidator bridge and form hook validators
 *
 * Tests that zodToValidator correctly converts Zod schemas into
 * boolean validator functions used by the form hook for client-side validation.
 *
 * Run with: bun test lib/utils/zodToValidator.test.ts
 */

import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { emailSchema, phoneSchema, zodToValidator } from './validation'

// ============================================
// zodToValidator
// ============================================

describe('zodToValidator', () => {
  test('returns a function', () => {
    const validate = zodToValidator(emailSchema)
    expect(typeof validate).toBe('function')
  })

  test('converts email schema to validator function', () => {
    const validate = zodToValidator(emailSchema)
    expect(validate('user@example.com')).toBe(true)
    expect(validate('not-an-email')).toBe(false)
    expect(validate('')).toBe(false)
  })

  test('converts phone schema to validator function', () => {
    const validate = zodToValidator(phoneSchema)
    expect(validate('+1234567890')).toBe(true)
    expect(validate('1234567890')).toBe(true)
    expect(validate('abc')).toBe(false)
    expect(validate('')).toBe(false)
  })

  test('works with a simple string schema', () => {
    const schema = z.string().min(3)
    const validate = zodToValidator(schema)
    expect(validate('abc')).toBe(true)
    expect(validate('ab')).toBe(false)
    expect(validate('')).toBe(false)
  })

  test('works with a regex schema', () => {
    const schema = z.string().regex(/^[A-Z]{3}$/)
    const validate = zodToValidator(schema)
    expect(validate('ABC')).toBe(true)
    expect(validate('abc')).toBe(false)
    expect(validate('AB')).toBe(false)
  })
})

// ============================================
// Email validator parity with emailSchema
// ============================================

describe('email validator parity', () => {
  const validate = zodToValidator(emailSchema)

  const testCases = [
    { input: 'test@test.com', expected: true },
    { input: 'a@b.co', expected: true },
    { input: 'name+tag@domain.com', expected: true },
    { input: 'user@sub.domain.co.uk', expected: true },
    { input: 'missing-at', expected: false },
    { input: '@no-local.com', expected: false },
    { input: '', expected: false },
    { input: 'no-at-sign', expected: false },
  ]

  for (const { input, expected } of testCases) {
    test(`"${input}" -> validator=${expected}, schema=${expected}`, () => {
      expect(validate(input)).toBe(expected)
      expect(emailSchema.safeParse(input).success).toBe(expected)
    })
  }
})

// ============================================
// Phone validator parity with phoneSchema
// ============================================

describe('phone validator parity', () => {
  const validate = zodToValidator(phoneSchema)

  const testCases = [
    { input: '+14155552671', expected: true },
    { input: '+442071234567', expected: true },
    { input: '1234567890', expected: true },
    { input: 'abc', expected: false },
    { input: '', expected: false },
    { input: '+', expected: false },
    { input: '+0123456789', expected: false },
  ]

  for (const { input, expected } of testCases) {
    test(`"${input}" -> validator=${expected}, schema=${expected}`, () => {
      expect(validate(input)).toBe(expected)
      expect(phoneSchema.safeParse(input).success).toBe(expected)
    })
  }
})
