'use client'

/**
 * Make sure a Shopify cart exists before a mutation needs one, serialised
 * across every tab in the browser.
 *
 * The problem this solves: `addItem` creates the cart when the `cartId`
 * cookie is absent. Two concurrent first-adds — two tabs, or a fast
 * double-submit — each saw no cookie and each created a cart. One cookie
 * won; the other cart, holding an item the buyer had just added, was
 * orphaned. Serverless invocations share nothing, so there is no server-side
 * place to reconcile them.
 *
 * The browser is the shared context. `navigator.locks` is held per origin
 * across tabs, so the first caller creates the cart and everyone queued
 * behind it finds the cookie already set and returns immediately.
 *
 * Deliberately does not return or receive the cart id: Shopify's cart id
 * embeds a secret their docs say to treat like a password, so it stays in an
 * httpOnly cookie the client never reads.
 */

const LOCK_NAME = 'satus.shopify.cart-ensure'

/** Set once per page load — the cart outlives a single add. */
let ensured = false

async function requestEnsure(): Promise<void> {
  const response = await fetch('/api/cart/ensure', {
    method: 'POST',
    // Same-origin by default, but be explicit: the whole point is the
    // Set-Cookie on the response.
    credentials: 'same-origin',
  })

  if (response.ok) ensured = true
}

/**
 * Type-guard, not a bare `typeof navigator` check: checking the property on
 * `globalThis` (rather than referencing the possibly-undeclared bare
 * identifier) can never throw, so it is safe in non-browser execution
 * contexts (SSR, tests) the same way `typeof navigator` would be.
 */
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
