'use server'

import { revalidateTag } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import { rateLimit, rateLimiters } from '@/lib/utils/rate-limit'
import { TAGS } from '../constants'
import {
  addToCart,
  createCart,
  getCart,
  removeFromCart,
  updateCart,
} from '../index'
import type { AddItemPayload, Cart, CartData } from '../types'

const addItemSchema = z.object({
  variantId: z.string().min(1, { error: 'Product variant ID is required' }),
  quantity: z.number().int().min(1).max(99).optional().default(1),
})

const updateQuantitySchema = z.object({
  merchandiseId: z.string().min(1, { error: 'Merchandise ID is required' }),
  quantity: z.number().int().min(0).max(99),
})

export async function removeItem(
  _prevState: unknown,
  merchandiseId: string
): Promise<string | undefined> {
  const _cookies = await cookies()
  const cartId = _cookies.get('cartId')?.value

  if (!cartId) {
    return 'Missing cart ID'
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const rateLimitResult = rateLimit(`cart-remove:${ip}`, rateLimiters.standard)
  if (!rateLimitResult.success) {
    return 'Too many requests. Please try again later.'
  }

  if (!merchandiseId) {
    return 'Merchandise ID is required'
  }

  try {
    const cart = (await getCart(cartId)) as CartData | undefined

    if (!cart) {
      return 'Error fetching cart'
    }

    const lineItem = cart.lines.find(
      (line) => line.merchandise.id === merchandiseId
    )

    if (lineItem?.id) {
      await removeFromCart(cartId, [lineItem.id])
      revalidateTag(TAGS.cart, {})
      return undefined
    }

    return 'Item not found in cart'
  } catch (_e) {
    return 'Error removing item from cart'
  }
}

export async function addItem(
  _prevState: unknown,
  { variantId, quantity = 1 }: AddItemPayload
): Promise<string> {
  const _cookies = await cookies()
  let cartId = _cookies.get('cartId')?.value
  let cart: unknown

  // This is here beacuse cookie can only be set server side
  // and useFormState executes the addItem action in the server
  if (!cartId) {
    cart = await createCart()
    cartId = (cart as { id: string }).id
    _cookies.set('cartId', cartId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const rateLimitResult = rateLimit(`cart-add:${ip}`, rateLimiters.standard)
  if (!rateLimitResult.success) {
    return 'Too many requests. Please try again later.'
  }

  const parsed = addItemSchema.safeParse({ variantId, quantity })
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? 'Invalid input'
  }

  try {
    await addToCart(cartId, [
      { merchandiseId: parsed.data.variantId, quantity: parsed.data.quantity },
    ])
    revalidateTag(TAGS.cart, {})

    return 'success'
  } catch (_e) {
    return 'Error adding item to cart'
  }
}

export async function updateItemQuantity(
  _prevState: unknown,
  payload: { merchandiseId: string; quantity: number } = {
    merchandiseId: '',
    quantity: 0,
  }
): Promise<string | undefined> {
  const _cookies = await cookies()
  const cartId = _cookies.get('cartId')?.value

  if (!cartId) {
    return 'Missing cart ID'
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const rateLimitResult = rateLimit(`cart-update:${ip}`, rateLimiters.standard)
  if (!rateLimitResult.success) {
    return 'Too many requests. Please try again later.'
  }

  const parsed = updateQuantitySchema.safeParse(payload)
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? 'Invalid input'
  }

  try {
    const cart = (await getCart(cartId)) as CartData | undefined

    if (!cart) {
      return 'Error fetching cart'
    }

    const { merchandiseId, quantity } = parsed.data

    const lineItem = cart.lines.find(
      (line) => line.merchandise.id === merchandiseId
    )

    if (!lineItem?.id) {
      return 'Item not found in cart'
    }

    await updateCart(cartId, [
      {
        id: lineItem.id,
        merchandiseId,
        quantity,
      },
    ])
    revalidateTag(TAGS.cart, {})
    return undefined
  } catch (_e) {
    return 'Error updating item quantity'
  }
}

export async function fetchCart(): Promise<Cart | undefined> {
  const _cookies = await cookies()
  const cartId = _cookies.get('cartId')?.value

  let cart: Cart | undefined

  if (cartId) {
    cart = await getCart(cartId)
  }

  return cart
}
