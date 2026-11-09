import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Whether `signature` could be an HMAC-SHA256 digest at all: present and 32
 * bytes once base64-decoded. Checked before reading the body, so a request
 * with no or junk signature costs no body read or HMAC.
 */
export function isWellFormedShopifySignature(
  signature: string | null
): signature is string {
  return !!signature && Buffer.from(signature, 'base64').length === 32
}

/**
 * Whether `signature` (the `X-Shopify-Hmac-Sha256` header) is Shopify's
 * base64 HMAC-SHA256 of `rawBody` under the webhook signing secret. The body
 * must be the exact bytes received: re-serialized JSON hashes differently.
 *
 * Kept out of `./revalidate.ts` so a test can import it without `next/cache`.
 */
export function isValidShopifySignature(
  rawBody: Uint8Array,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest()
  const received = Buffer.from(signature, 'base64')
  // `timingSafeEqual` throws on unequal lengths. A digest's length is public,
  // so checking it first leaks nothing.
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  )
}

/** How far `X-Shopify-Triggered-At` may be from now, in either direction. */
export const WEBHOOK_FRESHNESS_MS = 5 * 60 * 1000

/**
 * Whether `triggeredAt` (the `X-Shopify-Triggered-At` header, an ISO 8601
 * timestamp) is within `WEBHOOK_FRESHNESS_MS` of `now`. A missing or
 * unparseable value is stale. The header is not covered by the HMAC, so this
 * stops a signed request replayed unchanged from an old capture, not a
 * replayer who rewrites the header.
 */
export function isFreshShopifyWebhook(
  triggeredAt: string | null,
  now: number = Date.now()
): boolean {
  if (!triggeredAt) return false
  // Shopify sends nanosecond fractions; engines only promise milliseconds.
  const at = Date.parse(triggeredAt.replace(/(\.\d{3})\d+/, '$1'))
  return Number.isFinite(at) && Math.abs(now - at) <= WEBHOOK_FRESHNESS_MS
}

const SEEN_LIMIT = 1000

/**
 * A bounded set of delivery keys already accepted, oldest evicted first.
 * `rememberAll` returns false, recording nothing, if any key was seen before.
 */
export function createSeenSet(limit: number = SEEN_LIMIT) {
  const seen = new Set<string>()
  return {
    /** Records every key, or none and false if any was already seen. */
    rememberAll(keys: string[]): boolean {
      if (keys.some((key) => seen.has(key))) return false
      for (const key of keys) seen.add(key)
      while (seen.size > limit) {
        const oldest = seen.values().next().value
        if (oldest === undefined) break
        seen.delete(oldest)
      }
      return true
    },
    forget(keys: string[]) {
      for (const key of keys) seen.delete(key)
    },
  }
}
