import type { FormState } from '@/lib/types/form'

import type {
  CustomerAccessTokenCreateResponseData,
  CustomerCreateResponseData,
} from '../schemas'

export interface CreateCustomerInput {
  firstName: string
  lastName: string
  email: string
  password: string
}

/**
 * Dependencies `createCustomerAndSignIn` needs, as an injectable interface
 * rather than direct module imports. This file has no `next/headers` or
 * Shopify-client import of its own — `actions.ts` wires the real
 * implementations (which do need `cookies()` and `shopifyFetch`) — so tests
 * exercise the real create-then-signed-in logic against faithful fakes
 * without needing to mock any module (house convention: no module mocking,
 * see `oxlint.config.ts`'s `anti-slop/no-module-mocking`). Kept in its own
 * file, separate from `actions.ts`, specifically so importing it for tests
 * never transitively imports `next/headers` — a 'use server' action file
 * importing `cookies` at module scope would collide with any test file in
 * the same `bun test` run that has already replaced that module via
 * `mock.module` (e.g. lib/utils/form-action.test.ts).
 */
export interface CreateCustomerAndSignInDeps {
  createCustomer: (
    input: CreateCustomerInput
  ) => Promise<CustomerCreateResponseData['customerCreate']>
  createAccessToken: (
    email: string,
    password: string
  ) => Promise<
    CustomerAccessTokenCreateResponseData['customerAccessTokenCreate']
  >
  setSessionCookie: (accessToken: string, expiresAt: string) => Promise<void>
}

/**
 * Creates the Shopify customer, then signs them in immediately (standard
 * create-then-signed-in UX) by reusing the same token-create + cookie-set
 * path `LoginCustomerAction` uses. The account already exists once
 * `createCustomer` succeeds, so a token failure past that point is never
 * reported as a creation failure — it falls back to "created, please log
 * in" instead of silently pretending the customer is signed in.
 */
export async function createCustomerAndSignIn(
  input: CreateCustomerInput,
  deps: CreateCustomerAndSignInDeps
): Promise<FormState> {
  const { email, password } = input
  const { customer, customerUserErrors } = await deps.createCustomer(input)

  if (customerUserErrors.length) {
    return {
      status: 400,
      message: customerUserErrors[0]?.message ?? 'Unknown error',
    }
  }

  let signedIn = true
  try {
    const { customerAccessToken, customerUserErrors: tokenErrors } =
      await deps.createAccessToken(email, password)

    if (tokenErrors.length || !customerAccessToken) {
      signedIn = false
      console.error(
        'Error creating access token after signup:',
        tokenErrors[0]?.message ?? 'No access token returned'
      )
    } else {
      await deps.setSessionCookie(
        customerAccessToken.accessToken,
        customerAccessToken.expiresAt
      )
    }
  } catch (tokenError) {
    signedIn = false
    console.error('Error signing in after signup:', tokenError)
  }

  return {
    status: 200,
    message: signedIn
      ? 'Account created successfully'
      : 'Account created successfully. Please log in.',
    data: customer,
  }
}
