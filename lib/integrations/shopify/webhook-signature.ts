import { createHmac, timingSafeEqual } from 'node:crypto'

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
