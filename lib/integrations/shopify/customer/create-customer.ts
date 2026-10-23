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
 * Injected dependencies, wired to the real `cookies()` and `shopifyFetch` in
 * `actions.ts`, so tests use fakes instead of module mocks
 * (`anti-slop/no-module-mocking`). Kept out of `actions.ts` so importing it
 * never pulls in `next/headers`, which would collide with a test file in the
 * same `bun test` run that replaced that module via `mock.module` (e.g.
 * lib/utils/form-action.test.ts).
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
 * Creates the customer, then signs them in via the same token-create and
 * cookie-set path as `LoginCustomerAction`. A token failure after creation
 * succeeds is not a creation failure: it falls back to "created, please log
 * in" rather than pretending the customer is signed in.
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
