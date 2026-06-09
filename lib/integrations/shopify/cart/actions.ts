'use server'

import { revalidateTag } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { z } from 'zod'
import {
  getIPFromHeaders,
  rateLimit,
  rateLimiters,
} from '@/lib/utils/rate-limit'
import { TAGS } from '../constants'
import {
  addToCart,
  createCart,
  getCart,
  removeFromCart,
  updateCart,
} from '../index'
import type { AddItemPayload, Cart } from '../types'

/** Unified result shape for all cart mutations. */
export type CartActionResult = { ok: true } | { ok: false; error: string }

const addItemSchema = z.object({
  variantId: z.string().min(1, { error: 'Product variant ID is required' }),
  quantity: z.number().int().min(1).max(99).optional().default(1),
})

const updateQuantitySchema = z.object({
  merchandiseId: z.string().min(1, { error: 'Merchandise ID is required' }),
  quantity: z.number().int().min(0).max(99),
  lineId: z.string().optional(),
})

export async function removeItem(
  _prevState: unknown,
  merchandiseId: string,
  lineId?: string
): Promise<CartActionResult> {
  const _cookies = await cookies()
  const cartId = _cookies.get('cartId')?.value

  if (!cartId) {
    return { ok: false, error: 'Missing cart ID' }
  }

  const headersList = await headers()
  const ip = getIPFromHeaders(headersList)
  const rateLimitResult = rateLimit(`cart-remove:${ip}`, rateLimiters.standard)
  if (!rateLimitResult.success) {
    return { ok: false, error: 'Too many requests. Please try again later.' }
  }

  if (!merchandiseId) {
    return { ok: false, error: 'Merchandise ID is required' }
  }

  try {
    // Fast path: caller supplies lineId directly — skip the extra getCart round-trip.
    if (lineId) {
      await removeFromCart(cartId, [lineId])
      revalidateTag(TAGS.cart, {})
      return { ok: true }
    }

    // Fallback: resolve lineId from a fresh cart fetch (e.g. callers without lineId).
    const cart = await getCart(cartId)

    if (!cart) {
      return { ok: false, error: 'Error fetching cart' }
    }

    const lineItem = cart.lines.find(
      (line) => line.merchandise.id === merchandiseId
    )

    if (lineItem?.id) {
      await removeFromCart(cartId, [lineItem.id])
      revalidateTag(TAGS.cart, {})
      return { ok: true }
    }

    return { ok: false, error: 'Item not found in cart' }
  } catch (_e) {
    return { ok: false, error: 'Error removing item from cart' }
  }
}

export async function addItem(
  _prevState: unknown,
  { variantId, quantity = 1 }: AddItemPayload
): Promise<CartActionResult> {
  const headersList = await headers()
  const ip = getIPFromHeaders(headersList)
  const rateLimitResult = rateLimit(`cart-add:${ip}`, rateLimiters.standard)
  if (!rateLimitResult.success) {
    return { ok: false, error: 'Too many requests. Please try again later.' }
  }

  // Validate input before creating a cart, so an invalid request doesn't leave
  // an orphaned cart + cookie behind.
  const parsed = addItemSchema.safeParse({ variantId, quantity })
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    }
  }

  const _cookies = await cookies()
  let cartId = _cookies.get('cartId')?.value

  // This is here because cookie can only be set server side
  // and useFormState executes the addItem action in the server
  if (!cartId) {
    const cart = await createCart()
    cartId = cart.id
    _cookies.set('cartId', cartId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
  }

  try {
    await addToCart(cartId, [
      { merchandiseId: parsed.data.variantId, quantity: parsed.data.quantity },
    ])
    revalidateTag(TAGS.cart, {})

    return { ok: true }
  } catch (_e) {
    return { ok: false, error: 'Error adding item to cart' }
  }
}

export async function updateItemQuantity(
  _prevState: unknown,
  payload: {
    merchandiseId: string
    quantity: number
    lineId?: string | undefined
  } = {
    merchandiseId: '',
    quantity: 0,
  }
): Promise<CartActionResult> {
  const _cookies = await cookies()
  const cartId = _cookies.get('cartId')?.value

  if (!cartId) {
    return { ok: false, error: 'Missing cart ID' }
  }

  const headersList = await headers()
  const ip = getIPFromHeaders(headersList)
  const rateLimitResult = rateLimit(`cart-update:${ip}`, rateLimiters.standard)
  if (!rateLimitResult.success) {
    return { ok: false, error: 'Too many requests. Please try again later.' }
  }

  const parsed = updateQuantitySchema.safeParse(payload)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    }
  }

  const { merchandiseId, quantity, lineId } = parsed.data

  try {
    // Fast path: caller supplies lineId directly — skip the extra getCart round-trip.
    if (lineId) {
      await updateCart(cartId, [{ id: lineId, merchandiseId, quantity }])
      revalidateTag(TAGS.cart, {})
      return { ok: true }
    }

    // Fallback: resolve lineId from a fresh cart fetch (e.g. callers without lineId).
    const cart = await getCart(cartId)

    if (!cart) {
      return { ok: false, error: 'Error fetching cart' }
    }

    const lineItem = cart.lines.find(
      (line) => line.merchandise.id === merchandiseId
    )

    if (!lineItem?.id) {
      return { ok: false, error: 'Item not found in cart' }
    }

    await updateCart(cartId, [
      {
        id: lineItem.id,
        merchandiseId,
        quantity,
      },
    ])
    revalidateTag(TAGS.cart, {})
    return { ok: true }
  } catch (_e) {
    return { ok: false, error: 'Error updating item quantity' }
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
