'use server'

import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import type { FormState } from '@/components/ui/form/types'
import { rateLimit, rateLimiters } from '@/lib/utils/rate-limit'
import { emailSchema } from '@/utils/validation'
import { shopifyFetch } from '../index'
import {
  customerAccessTokenCreateMutation,
  customerAccessTokenDeleteMutation,
  customerCreateMutation,
} from '../mutations/customer'
import { getCustomerQuery } from '../queries/customer'

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
  // Rate limit login attempts to prevent brute force attacks
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const rateLimitResult = rateLimit(`login:${ip}`, rateLimiters.strict)

  if (!rateLimitResult.success) {
    return {
      status: 429,
      message: `Too many login attempts. Please try again in ${rateLimitResult.resetIn} seconds.`,
    }
  }

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.')
      if (path && !fieldErrors[path]) {
        fieldErrors[path] = issue.message
      }
    }
    return { status: 400, message: 'Invalid input', fieldErrors }
  }

  const { email, password } = parsed.data

  try {
    const res = await shopifyFetch<{
      customerAccessTokenCreate: {
        customerAccessToken: { accessToken: string; expiresAt: string } | null
        customerUserErrors: Array<{ message: string }>
      }
    }>({
      query: customerAccessTokenCreateMutation,
      variables: {
        input: {
          email,
          password,
        },
      },
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
  // Rate limit registration to prevent spam account creation
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const rateLimitResult = rateLimit(`register:${ip}`, rateLimiters.standard)

  if (!rateLimitResult.success) {
    return {
      status: 429,
      message: `Too many registration attempts. Please try again in ${rateLimitResult.resetIn} seconds.`,
    }
  }

  const parsed = createCustomerSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.')
      if (path && !fieldErrors[path]) {
        fieldErrors[path] = issue.message
      }
    }
    return { status: 400, message: 'Invalid input', fieldErrors }
  }

  const { firstName, lastName, email, password } = parsed.data

  try {
    const res = await shopifyFetch<{
      customerCreate: {
        customer: unknown
        customerUserErrors: Array<{ message: string }>
      }
    }>({
      query: customerCreateMutation,
      variables: {
        input: {
          firstName,
          lastName,
          email,
          password,
        },
      },
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
}

export async function getCustomer(): Promise<unknown> {
  const _cookies = await cookies()
  const customerAccessToken = _cookies.get('customerAccessToken')?.value

  if (!customerAccessToken) {
    return null
  }

  try {
    const res = await shopifyFetch<{ customer: unknown }>({
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
