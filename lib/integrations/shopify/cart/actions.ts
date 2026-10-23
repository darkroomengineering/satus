'use server'

import { revalidateTag } from 'next/cache'
import { cookies, headers } from 'next/headers'
import { z } from 'zod'

import {
  getIPFromHeaders,
  rateLimit,
  rateLimiters,
} from '@/lib/utils/rate-limit'

import {
  addToCart,
  createCart,
  getCart,
  removeFromCart,
  setCartIdCookie,
  updateCart,
} from '../cart-operations'
import { TAGS } from '../constants'
import type { AddItemPayload, Cart } from '../types'

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

/**
 * Rate-limits by client IP, then runs the action. `rateLimitPrefix` is the key
 * prefix (e.g. "cart-add"); the IP is appended.
 */
async function runCartAction(
  rateLimitPrefix: string,
  run: () => Promise<CartActionResult>
): Promise<CartActionResult> {
  const headersList = await headers()
  const ip = getIPFromHeaders(headersList)
  if (ip) {
    const rateLimitResult = rateLimit(
      `${rateLimitPrefix}:${ip}`,
      rateLimiters.standard
    )
    if (!rateLimitResult.success) {
      return { ok: false, error: 'Too many requests. Please try again later.' }
    }
  }
  return run()
}

/**
 * Resolves the cart line ID for a merchandise item. Returns a caller-supplied
 * `lineId` as-is (skipping a `getCart` round trip), else looks it up in the
 * cart.
 */
async function resolveLineId(
  cartId: string,
  lineId: string | undefined,
  merchandiseId: string
): Promise<{ lineId: string } | { error: string }> {
  if (lineId) return { lineId }

  const cart = await getCart(cartId)
  if (!cart) return { error: 'Error fetching cart' }

  const lineItem = cart.lines.find(
    (line) => line.merchandise.id === merchandiseId
  )
  return lineItem?.id
    ? { lineId: lineItem.id }
    : { error: 'Item not found in cart' }
}

export async function removeItem(
  _prevState: null,
  merchandiseId: string,
  lineId?: string
): Promise<CartActionResult> {
  const _cookies = await cookies()
  const cartId = _cookies.get('cartId')?.value

  if (!cartId) {
    return { ok: false, error: 'Missing cart ID' }
  }

  if (!merchandiseId) {
    return { ok: false, error: 'Merchandise ID is required' }
  }

  return runCartAction('cart-remove', async () => {
    try {
      const resolved = await resolveLineId(cartId, lineId, merchandiseId)

      if ('error' in resolved) {
        return { ok: false, error: resolved.error }
      }

      await removeFromCart(cartId, [resolved.lineId])
      revalidateTag(TAGS.cart, {})
      return { ok: true }
    } catch (_e) {
      return { ok: false, error: 'Error removing item from cart' }
    }
  })
}

export async function addItem(
  _prevState: null,
  { variantId, quantity = 1 }: AddItemPayload
): Promise<CartActionResult> {
  return runCartAction('cart-add', async () => {
    // Validate before creating a cart, so an invalid request leaves no
    // orphaned cart + cookie.
    const parsed = addItemSchema.safeParse({ variantId, quantity })
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid input',
      }
    }

    const _cookies = await cookies()
    let cartId = _cookies.get('cartId')?.value

    // The cookie's cart id can be stale: Shopify nulls a cart once checkout
    // completes, but the 30-day cookie outlives it, and a dead id would fail
    // every post-checkout add. Drop a dead id so the create branch runs. On a
    // transient getCart failure keep the id, so a live cart isn't orphaned and
    // addToCart surfaces any real problem.
    if (cartId) {
      try {
        if (!(await getCart(cartId))) cartId = undefined
      } catch {
        // Liveness check failed transiently; keep the existing id.
      }
    }

    // The cookie can only be set server side.
    if (!cartId) {
      const cart = await createCart()
      cartId = cart.id
      setCartIdCookie(_cookies, cartId)
    }

    try {
      await addToCart(cartId, [
        {
          merchandiseId: parsed.data.variantId,
          quantity: parsed.data.quantity,
        },
      ])
      revalidateTag(TAGS.cart, {})

      return { ok: true }
    } catch (_e) {
      return { ok: false, error: 'Error adding item to cart' }
    }
  })
}

export async function updateItemQuantity(
  _prevState: null,
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

  return runCartAction('cart-update', async () => {
    const parsed = updateQuantitySchema.safeParse(payload)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid input',
      }
    }

    const { merchandiseId, quantity, lineId } = parsed.data

    try {
      const resolved = await resolveLineId(cartId, lineId, merchandiseId)

      if ('error' in resolved) {
        return { ok: false, error: resolved.error }
      }

      await updateCart(cartId, [
        { id: resolved.lineId, merchandiseId, quantity },
      ])
      revalidateTag(TAGS.cart, {})
      return { ok: true }
    } catch (_e) {
      return { ok: false, error: 'Error updating item quantity' }
    }
  })
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
