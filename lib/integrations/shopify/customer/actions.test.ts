/**
 * Unit tests for `createCustomerAndSignIn`'s create-then-signed-in behavior
 * (L7 audit finding). It lives in ./create-customer.ts — a plain function
 * taking its Shopify-client/cookie dependencies as parameters, with no
 * `next/headers` import of its own — so it's exercised here against
 * faithful fakes instead of mocking a module (house convention: no
 * module mocking; see `oxlint.config.ts`'s `anti-slop/no-module-mocking`).
 * Importing from `./actions` instead would pull in `next/headers` at
 * module scope, which breaks when this file runs in the same `bun test`
 * process as lib/utils/form-action.test.ts (its `mock.module('next/headers', ...)`
 * permanently replaces the module for the rest of the run).
 *
 * The login/createCustomer Zod schemas in actions.ts are inline, not
 * exported, so they aren't covered here — a hand-copied replica of them
 * would drift from the real schema silently and never catch a regression.
 *
 * Run with: bun test lib/integrations/shopify/customer/actions.test.ts
 */

import { describe, expect, test } from 'bun:test'

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
