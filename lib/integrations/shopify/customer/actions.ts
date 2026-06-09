'use server'

import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import type { FormState } from '@/components/ui/form/types'
import { runFormAction } from '@/lib/utils/form-action'
import {
  getIPFromHeaders,
  rateLimit,
  rateLimiters,
} from '@/lib/utils/rate-limit'
import { emailSchema } from '@/utils/validation'
import { shopifyFetch } from '../index'
import {
  customerAccessTokenCreateMutation,
  customerAccessTokenDeleteMutation,
  customerCreateMutation,
} from '../mutations/customer'
import { getCustomerQuery } from '../queries/customer'
import type { Customer } from '../types'

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

export async function LoginCustomerAction(
  _prevState: FormState | null,
  formData: FormData
): Promise<FormState> {
  // Login uses strict rate limiting (5 req/min) to prevent brute-force attacks.
  // runFormAction applies standard limiting, so we pre-check strict here.
  const headersList = await headers()
  const ip = getIPFromHeaders(headersList)
  const rateLimitResult = rateLimit(`login:${ip}`, rateLimiters.strict)

  if (!rateLimitResult.success) {
    return {
      status: 429,
      message: `Too many login attempts. Please try again in ${rateLimitResult.resetIn} seconds.`,
    }
  }

  return runFormAction({
    rateLimitPrefix: 'login-form',
    schema: loginSchema,
    formData,
    run: async ({ email, password }) => {
      try {
        const res = await shopifyFetch<{
          customerAccessTokenCreate: {
            customerAccessToken: {
              accessToken: string
              expiresAt: string
            } | null
            customerUserErrors: Array<{ message: string }>
          }
        }>({
          query: customerAccessTokenCreateMutation,
          variables: { input: { email, password } },
          cache: 'no-store',
        })

        const { customerAccessToken, customerUserErrors } =
          res.body.data.customerAccessTokenCreate

        if (customerUserErrors.length) {
          return {
            status: 400,
            message: customerUserErrors[0]?.message ?? 'Unknown error',
          }
        }

        if (customerAccessToken) {
          const _cookies = await cookies()
          _cookies.set('customerAccessToken', customerAccessToken.accessToken, {
            expires: new Date(customerAccessToken.expiresAt),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          })
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
      await shopifyFetch({
        query: customerAccessTokenDeleteMutation,
        variables: {
          customerAccessToken,
        },
        cache: 'no-store',
      })
    } catch (error) {
      console.error('Error during logout:', error)
    }
    _cookies.delete('customerAccessToken')
  }

  return { status: 200, message: 'Logged out successfully' }
}

export async function CreateCustomerAction(
  _prevState: FormState | null,
  formData: FormData
): Promise<FormState> {
  return runFormAction({
    rateLimitPrefix: 'register',
    schema: createCustomerSchema,
    formData,
    run: async ({ firstName, lastName, email, password }) => {
      try {
        const res = await shopifyFetch<{
          customerCreate: {
            customer: Customer | null
            customerUserErrors: Array<{ message: string }>
          }
        }>({
          query: customerCreateMutation,
          variables: { input: { firstName, lastName, email, password } },
          cache: 'no-store',
        })

        const { customer, customerUserErrors } = res.body.data.customerCreate

        if (customerUserErrors.length) {
          return {
            status: 400,
            message: customerUserErrors[0]?.message ?? 'Unknown error',
          }
        }

        return {
          status: 200,
          message: 'Account created successfully',
          data: customer,
        }
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
    const res = await shopifyFetch<{ customer: Customer | null }>({
      query: getCustomerQuery,
      variables: {
        customerAccessToken,
      },
      cache: 'no-store',
    })

    return res.body.data.customer
  } catch (error) {
    console.error('Error fetching customer data:', error)
    return null
  }
}
