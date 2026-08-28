import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { isConfigured } from '@/integrations/registry'
import {
  createCart,
  setCartIdCookie,
} from '@/integrations/shopify/cart-operations'

/**
 * Idempotently ensure the visitor has a Shopify cart, and return nothing but
 * whether one now exists.
 *
 * Exists to close a race: `addItem` creates the cart when the `cartId` cookie
 * is absent, so two concurrent first-adds each created their own cart. One
 * cookie won and the other cart — with the item the buyer had just added —
 * was orphaned. Serverless invocations share no state, so the fix has to
 * happen where the requests do share something: the browser. Clients call
 * this behind a cross-tab Web Lock (see `ensure-cart.ts`), so only one
 * request can be in flight per browser and every later one finds the cookie
 * already set.
 *
 * The cart id never leaves the server. Shopify's cart id embeds a secret and
 * their docs say to treat it like a password, so it stays in an httpOnly
 * cookie and this route reports only presence.
 */
export async function POST() {
  if (!isConfigured('shopify')) {
    return NextResponse.json(
      { data: null, error: 'Shopify is not configured' },
      { status: 503 }
    )
  }

  const cookieStore = await cookies()

  // Already have one — the common case once a visitor has added anything, and
  // the case every request queued behind the Web Lock hits.
  if (cookieStore.get('cartId')?.value) {
    return NextResponse.json({ data: { ready: true }, error: null })
  }

  try {
    const cart = await createCart()

    setCartIdCookie(cookieStore, cart.id)

    return NextResponse.json({ data: { ready: true }, error: null })
  } catch {
    // Not fatal to the caller: `addItem` still creates a cart when the cookie
    // is missing, so a failure here costs the race protection, not the sale.
    return NextResponse.json(
      { data: { ready: false }, error: 'Cart creation failed' },
      { status: 502 }
    )
  }
}
