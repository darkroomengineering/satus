/**
 * Unit tests for `createCustomerAndSignIn` (./create-customer.ts), run against
 * fakes for its injected dependencies (no module mocking,
 * `anti-slop/no-module-mocking`). Importing from `./actions` would pull in
 * `next/headers`, which breaks in the same `bun test` process as
 * lib/utils/form-action.test.ts (its `mock.module('next/headers', ...)`
 * replaces the module for the rest of the run).
 *
 * The inline Zod schemas in actions.ts aren't covered: a hand-copied replica
 * would drift silently and never catch a regression.
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
        return {
          customerAccessToken: validAccessToken,
          customerUserErrors: [],
        }
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
