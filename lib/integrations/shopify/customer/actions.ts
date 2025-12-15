'use server'

import { cookies } from 'next/headers'
import { shopifyFetch } from '../index'
import {
  customerAccessTokenCreateMutation,
  customerAccessTokenDeleteMutation,
  customerCreateMutation,
} from '../mutations/customer'
import { getCustomerQuery } from '../queries/customer'

interface ActionResult {
  error?: string
  success?: boolean
  customer?: unknown
}

export async function LoginCustomerAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get('email')
  const password = formData.get('password')

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
      return { error: customerUserErrors[0].message }
    }

    if (customerAccessToken) {
      const _cookies = await cookies()
      _cookies.set('customerAccessToken', customerAccessToken.accessToken, {
        expires: new Date(customerAccessToken.expiresAt),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      })
    }

    return { success: true }
  } catch (_error) {
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function LogoutCustomerAction(): Promise<ActionResult> {
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

  return { success: true }
}

export async function CreateCustomerAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionResult> {
  const firstName = formData.get('firstName')
  const lastName = formData.get('lastName')
  const email = formData.get('email')
  const password = formData.get('password')

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
      return { error: customerUserErrors[0].message }
    }

    return { success: true, customer }
  } catch (_error) {
    return { error: 'An unexpected error occurred. Please try again.' }
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
