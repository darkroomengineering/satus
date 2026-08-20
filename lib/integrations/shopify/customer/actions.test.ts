/**
 * Unit tests for Shopify customer actions.
 *
 * Two parts:
 * 1. The login/createCustomer Zod schemas, tested in isolation.
 * 2. `createCustomerAndSignIn`'s create-then-signed-in behavior (L7 audit
 *    finding). It lives in ./create-customer.ts — a plain function taking
 *    its Shopify-client/cookie dependencies as parameters, with no
 *    `next/headers` import of its own — so it's exercised here against
 *    faithful fakes instead of mocking a module (house convention: no
 *    module mocking; see `oxlint.config.ts`'s `anti-slop/no-module-mocking`).
 *    Importing from `./actions` instead would pull in `next/headers` at
 *    module scope, which breaks when this file runs in the same `bun test`
 *    process as lib/utils/form-action.test.ts (its `mock.module('next/headers', ...)`
 *    permanently replaces the module for the rest of the run).
 *
 * Run with: bun test lib/integrations/shopify/customer/actions.test.ts
 */

import { describe, expect, test } from 'bun:test'

import { z } from 'zod'

import { emailSchema } from '@/utils/validation'

import {
  type CreateCustomerAndSignInDeps,
  createCustomerAndSignIn,
} from './create-customer'

const validInput = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'password123',
}

const validCustomer = {
  id: 'gid://shopify/Customer/1',
  email: validInput.email,
  firstName: validInput.firstName,
  lastName: validInput.lastName,
}

const validAccessToken = {
  accessToken: 'token-abc',
  expiresAt: '2099-01-01T00:00:00Z',
}

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

// ============================================
// createCustomerAndSignIn — create-then-signed-in (L7)
// ============================================

describe('createCustomerAndSignIn', () => {
  test('signs the new customer in: sets the session cookie and returns success', async () => {
    const sessionCookieCalls: { accessToken: string; expiresAt: string }[] = []
    const deps: CreateCustomerAndSignInDeps = {
      createCustomer: async () => ({
        customer: validCustomer,
        customerUserErrors: [],
      }),
      createAccessToken: async () => ({
        customerAccessToken: validAccessToken,
        customerUserErrors: [],
      }),
      setSessionCookie: async (accessToken, expiresAt) => {
        sessionCookieCalls.push({ accessToken, expiresAt })
      },
    }

    const result = await createCustomerAndSignIn(validInput, deps)

    expect(result.status).toBe(200)
    expect(result.message).toBe('Account created successfully')
    expect(result.data).toEqual(validCustomer)
    expect(sessionCookieCalls).toEqual([validAccessToken])
  })

  test('account creation errors return 400 and never attempt sign-in', async () => {
    let accessTokenCalls = 0
    const deps: CreateCustomerAndSignInDeps = {
      createCustomer: async () => ({
        customer: null,
        customerUserErrors: [{ message: 'Email has already been taken' }],
      }),
      createAccessToken: async () => {
        accessTokenCalls++
        return { customerAccessToken: validAccessToken, customerUserErrors: [] }
      },
      setSessionCookie: async () => undefined,
    }

    const result = await createCustomerAndSignIn(validInput, deps)

    expect(result.status).toBe(400)
    expect(result.message).toBe('Email has already been taken')
    expect(accessTokenCalls).toBe(0)
  })

  test('account created but token creation fails: still reports success, no cookie set', async () => {
    let cookieCalls = 0
    const deps: CreateCustomerAndSignInDeps = {
      createCustomer: async () => ({
        customer: validCustomer,
        customerUserErrors: [],
      }),
      createAccessToken: async () => ({
        customerAccessToken: null,
        customerUserErrors: [{ message: 'Unauthorized' }],
      }),
      setSessionCookie: async () => {
        cookieCalls++
      },
    }

    const result = await createCustomerAndSignIn(validInput, deps)

    // The account exists — this is never reported as a total failure.
    expect(result.status).toBe(200)
    expect(result.message).toBe('Account created successfully. Please log in.')
    expect(result.data).toEqual(validCustomer)
    expect(cookieCalls).toBe(0)
  })

  test('account created but the token request throws: still reports success, no cookie set', async () => {
    let cookieCalls = 0
    const deps: CreateCustomerAndSignInDeps = {
      createCustomer: async () => ({
        customer: validCustomer,
        customerUserErrors: [],
      }),
      createAccessToken: async () => {
        throw new Error('network error')
      },
      setSessionCookie: async () => {
        cookieCalls++
      },
    }

    const result = await createCustomerAndSignIn(validInput, deps)

    expect(result.status).toBe(200)
    expect(result.message).toBe('Account created successfully. Please log in.')
    expect(cookieCalls).toBe(0)
  })
})
