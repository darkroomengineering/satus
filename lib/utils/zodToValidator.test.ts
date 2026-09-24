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
