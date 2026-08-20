'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'

import type { FormState } from '@/lib/types/form'
import { runFormAction } from '@/lib/utils/form-action'
import { rateLimiters } from '@/lib/utils/rate-limit'
import { emailSchema } from '@/utils/validation'

import { shopifyFetch } from '../client'
import {
  customerAccessTokenCreateMutation,
  customerAccessTokenDeleteMutation,
  customerCreateMutation,
} from '../mutations/customer'
import { getCustomerQuery } from '../queries/customer'
import {
  type CustomerAccessTokenCreateResponseData,
  type CustomerAccessTokenDeleteResponseData,
  type CustomerCreateResponseData,
  customerAccessTokenCreateResponseSchema,
  customerAccessTokenDeleteResponseSchema,
  customerCreateResponseSchema,
  type GetCustomerResponseData,
  getCustomerResponseSchema,
} from '../schemas'
import type { Customer } from '../types'
import {
  type CreateCustomerAndSignInDeps,
  createCustomerAndSignIn,
} from './create-customer'

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

/**
 * Calls the customerAccessTokenCreate mutation and returns the raw result.
 * Shared by LoginCustomerAction and CreateCustomerAction — a fresh account
 * is signed in the same way an existing customer logs in.
 */
async function createCustomerAccessToken(
  email: string,
  password: string
): Promise<CustomerAccessTokenCreateResponseData['customerAccessTokenCreate']> {
  const res = await shopifyFetch<CustomerAccessTokenCreateResponseData>({
    query: customerAccessTokenCreateMutation,
    variables: { input: { email, password } },
    cache: 'no-store',
    dataSchema: customerAccessTokenCreateResponseSchema,
  })

  return res.body.data.customerAccessTokenCreate
}

/** Sets the httpOnly session cookie for a Shopify customer access token. */
async function setCustomerAccessTokenCookie(
  accessToken: string,
  expiresAt: string
): Promise<void> {
  const _cookies = await cookies()
  _cookies.set('customerAccessToken', accessToken, {
    expires: new Date(expiresAt),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })
}

// Both actions below go through runFormAction, which rate-limits and then
// verifies Cloudflare Turnstile by default — these are exactly the endpoints
// credential-stuffing and account-creation bots target. Render a Turnstile
// widget in the corresponding form (see lib/integrations/turnstile/README.md)
// so its token lands in the `cf-turnstile-response` field.
export async function LoginCustomerAction(
  _prevState: FormState | null,
  formData: FormData
): Promise<FormState> {
  return runFormAction({
    rateLimitPrefix: 'login-form',
    schema: loginSchema,
    formData,
    turnstile: true,
    rateLimiter: rateLimiters.strict,
    rateLimitMessage: 'Too many login attempts. Please try again later.',
    run: async ({ email, password }) => {
      try {
        const { customerAccessToken, customerUserErrors } =
          await createCustomerAccessToken(email, password)

        if (customerUserErrors.length) {
          return {
            status: 400,
            message: customerUserErrors[0]?.message ?? 'Unknown error',
          }
        }

        if (customerAccessToken) {
          await setCustomerAccessTokenCookie(
            customerAccessToken.accessToken,
            customerAccessToken.expiresAt
          )
        }

        return { status: 200, message: 'Login successful' }
      } catch (_error) {
        return {
          status: 500,
          message: 'An unexpected error occurred. Please try again.',
        }
      }
    },
  })
}

export async function LogoutCustomerAction(
  _prevState: FormState | null,
  _formData: FormData
): Promise<FormState> {
  const _cookies = await cookies()
  const customerAccessToken = _cookies.get('customerAccessToken')?.value

  if (customerAccessToken) {
    try {
      await shopifyFetch<CustomerAccessTokenDeleteResponseData>({
        query: customerAccessTokenDeleteMutation,
        variables: {
          customerAccessToken,
        },
        cache: 'no-store',
        dataSchema: customerAccessTokenDeleteResponseSchema,
      })
    } catch (error) {
      console.error('Error during logout:', error)
    }
    _cookies.delete('customerAccessToken')
  }

  return { status: 200, message: 'Logged out successfully' }
}

/** Wires `createCustomerAndSignIn`'s dependencies to the real Shopify client and cookie jar. */
const liveCreateCustomerAndSignInDeps: CreateCustomerAndSignInDeps = {
  createCustomer: async (input) => {
    const res = await shopifyFetch<CustomerCreateResponseData>({
      query: customerCreateMutation,
      // Copied into a plain object: GraphQL variables are a JSON value bag,
      // not a place for a named domain interface (same pattern as
      // cart-operations.ts's addToCart/updateCart).
      variables: { input: { ...input } },
      cache: 'no-store',
      dataSchema: customerCreateResponseSchema,
    })
    return res.body.data.customerCreate
  },
  createAccessToken: createCustomerAccessToken,
  setSessionCookie: setCustomerAccessTokenCookie,
}

export async function CreateCustomerAction(
  _prevState: FormState | null,
  formData: FormData
): Promise<FormState> {
  return runFormAction({
    rateLimitPrefix: 'register',
    schema: createCustomerSchema,
    formData,
    turnstile: true,
    run: async (input) => {
      try {
        return await createCustomerAndSignIn(
          input,
          liveCreateCustomerAndSignInDeps
        )
      } catch (_error) {
        return {
          status: 500,
          message: 'An unexpected error occurred. Please try again.',
        }
      }
    },
  })
}

export async function getCustomer(): Promise<Customer | null> {
  const _cookies = await cookies()
  const customerAccessToken = _cookies.get('customerAccessToken')?.value

  if (!customerAccessToken) {
    return null
  }

  try {
    const res = await shopifyFetch<GetCustomerResponseData>({
      query: getCustomerQuery,
      variables: {
        customerAccessToken,
      },
      cache: 'no-store',
      dataSchema: getCustomerResponseSchema,
    })

    return res.body.data.customer
  } catch (error) {
    console.error('Error fetching customer data:', error)
    return null
  }
}
