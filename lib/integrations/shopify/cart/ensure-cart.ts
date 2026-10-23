'use client'

/**
 * Ensures a Shopify cart exists before a mutation needs one, serialised across
 * every tab.
 *
 * `addItem` creates the cart when the `cartId` cookie is absent, so two
 * concurrent first-adds (two tabs, a fast double-submit) each created one; one
 * cookie won and the other cart, holding the buyer's item, was orphaned.
 * Serverless invocations share nothing, so the browser is the shared context:
 * `navigator.locks` is held per origin across tabs, and callers queued behind
 * the creator find the cookie set and return.
 *
 * Deliberately does not return or receive the cart id: Shopify's docs say to
 * treat it like a password, so it stays in an httpOnly cookie the client never
 * reads.
 */

const LOCK_NAME = 'satus.shopify.cart-ensure'

let ensured = false

async function requestEnsure(): Promise<void> {
  const response = await fetch('/api/cart/ensure', {
    method: 'POST',
    credentials: 'same-origin',
  })

  if (response.ok) ensured = true
}

// Checks the property on `globalThis` so it never throws where `navigator` is
// undeclared (SSR, tests).
function hasNavigator(
  scope: typeof globalThis
): scope is typeof globalThis & { navigator: Navigator } {
  return typeof scope.navigator !== 'undefined'
}

export async function ensureCart(): Promise<void> {
  if (ensured) return

  // Web Locks is unavailable on older Safari and in non-secure contexts.
  // Falling back to an unsynchronised call keeps the flow working; the worst
  // case is the pre-existing race, never a failed add.
  if (!hasNavigator(globalThis) || !navigator.locks) {
    await requestEnsure()
    return
  }

  await navigator.locks.request(LOCK_NAME, async () => {
    // Re-check inside the lock: a tab that queued behind the creator has
    // nothing left to do.
    if (ensured) return
    await requestEnsure()
  })
}
