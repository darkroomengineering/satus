/**
 * Unit tests for Shopify customer action validation schemas
 *
 * Tests the login and createCustomer Zod schemas in isolation,
 * without requiring Next.js server-side mocks (headers, cookies, etc.).
 *
 * Run with: bun test lib/integrations/shopify/customer/actions.test.ts
 */

import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { emailSchema } from '@/utils/validation'

// Replicate schemas from actions.ts to test validation in isolation
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Password is required' }),
})

const createCustomerSchema = z.object({
  firstName: z.string().min(1, { error: 'First name is required' }),
  lastName: z.string().min(1, { error: 'Last name is required' }),
  email: emailSchema,
  password: z
    .string()
    .min(8, { error: 'Password must be at least 8 characters' }),
})

// ============================================
// login schema
// ============================================

describe('login schema', () => {
  test('valid credentials pass', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret123',
    })
    expect(result.success).toBe(true)
  })

  test('valid credentials with complex email pass', () => {
    const result = loginSchema.safeParse({
      email: 'name+tag@sub.domain.co.uk',
      password: 'p',
    })
    expect(result.success).toBe(true)
  })

  test('invalid email fails', () => {
    const result = loginSchema.safeParse({
      email: 'not-email',
      password: 'secret123',
    })
    expect(result.success).toBe(false)
  })

  test('empty email fails', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'secret123',
    })
    expect(result.success).toBe(false)
  })

  test('empty password fails', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
  })

  test('missing both fields fails', () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('missing email fails', () => {
    const result = loginSchema.safeParse({ password: 'secret123' })
    expect(result.success).toBe(false)
  })

  test('missing password fails', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(false)
  })

  test('error issues contain path for invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'bad',
      password: 'secret123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('email')
    }
  })

  test('error issues contain path for empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('password')
    }
  })
})

// ============================================
// createCustomer schema
// ============================================

describe('createCustomer schema', () => {
  test('valid input passes', () => {
    const result = createCustomerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  test('password exactly 8 characters passes', () => {
    const result = createCustomerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: '12345678',
    })
    expect(result.success).toBe(true)
  })

  test('password under 8 characters fails', () => {
    const result = createCustomerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })

  test('password of 7 characters fails', () => {
    const result = createCustomerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: '1234567',
    })
    expect(result.success).toBe(false)
  })

  test('empty password fails', () => {
    const result = createCustomerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: '',
    })
    expect(result.success).toBe(false)
  })

  test('missing firstName fails', () => {
    const result = createCustomerSchema.safeParse({
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  test('empty firstName fails', () => {
    const result = createCustomerSchema.safeParse({
      firstName: '',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  test('missing lastName fails', () => {
    const result = createCustomerSchema.safeParse({
      firstName: 'John',
      email: 'john@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  test('empty lastName fails', () => {
    const result = createCustomerSchema.safeParse({
      firstName: 'John',
      lastName: '',
      email: 'john@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  test('invalid email fails', () => {
    const result = createCustomerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      email: 'nope',
      password: 'password123',
    })
    expect(result.success).toBe(false)
  })

  test('all fields empty fails', () => {
    const result = createCustomerSchema.safeParse({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    })
    expect(result.success).toBe(false)
  })

  test('all fields missing fails', () => {
    const result = createCustomerSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('multiple errors reported for multiple invalid fields', () => {
    const result = createCustomerSchema.safeParse({
      firstName: '',
      lastName: '',
      email: 'bad',
      password: 'short',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(3)
    }
  })
})
