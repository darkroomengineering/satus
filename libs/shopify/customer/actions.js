'use server'

import { shopifyFetch } from 'libs/shopify'
import { cookies } from 'next/headers'
import {
  customerAccessTokenCreateMutation,
  customerAccessTokenDeleteMutation,
  customerCreateMutation,
} from '../mutations/customer'
import { getCustomerQuery } from '../queries/customer'

export async function LoginCustomerAction(prevState, formData) {
  const email = formData.get('email')
  const password = formData.get('password')

  try {
    const res = await shopifyFetch({
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
      cookies().set('customerAccessToken', customerAccessToken.accessToken, {
        expires: new Date(customerAccessToken.expiresAt),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      })
    }

    return { success: true }
  } catch (error) {
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function LogoutCustomerAction() {
  const customerAccessToken = cookies().get('customerAccessToken')?.value

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

    cookies().delete('customerAccessToken')
  }

  return { success: true }
}

export async function CreateCustomerAction(prevState, formData) {
  const firstName = formData.get('firstName')
  const lastName = formData.get('lastName')
  const email = formData.get('email')
  const password = formData.get('password')

  try {
    const res = await shopifyFetch({
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
  } catch (error) {
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function getCustomer() {
  const customerAccessToken = cookies().get('customerAccessToken')?.value

  if (!customerAccessToken) {
    return null
  }

  try {
    const res = await shopifyFetch({
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
