import { describe, expect, test } from 'bun:test'
import { createHmac } from 'node:crypto'

import {
  createSeenSet,
  isFreshShopifyWebhook,
  WEBHOOK_FRESHNESS_MS,
  isValidShopifySignature,
  isWellFormedShopifySignature,
} from './webhook-signature'

const secret = 'webhook-signing-secret'
const body = new TextEncoder().encode(
  JSON.stringify({ id: 1, title: 'Shirt', price: '10.00' })
)
// What Shopify sends: base64 HMAC-SHA256 of the raw body.
const sign = (bytes: Uint8Array, key = secret) =>
  createHmac('sha256', key).update(bytes).digest('base64')

describe('isValidShopifySignature', () => {
  test('accepts the signature Shopify computes over the raw body', () => {
    expect(isValidShopifySignature(body, sign(body), secret)).toBe(true)
  })

  test('rejects a signature made with another secret', () => {
    expect(isValidShopifySignature(body, sign(body, 'other'), secret)).toBe(
      false
    )
  })

  test('rejects a request without the signature header', () => {
    expect(isValidShopifySignature(body, null, secret)).toBe(false)
    expect(isValidShopifySignature(body, '', secret)).toBe(false)
  })

  test('rejects a body changed after signing', () => {
    const tampered = new TextEncoder().encode(
      JSON.stringify({ id: 1, title: 'Shirt', price: '0.01' })
    )
    expect(isValidShopifySignature(tampered, sign(body), secret)).toBe(false)
  })

  test('rejects a malformed or truncated signature without throwing', () => {
    expect(isValidShopifySignature(body, 'not base64 !!', secret)).toBe(false)
    expect(isValidShopifySignature(body, sign(body).slice(0, 20), secret)).toBe(
      false
    )
  })
})

describe('isWellFormedShopifySignature', () => {
  test('accepts a base64 SHA-256 digest', () => {
    const digest = createHmac('sha256', 'k').update('b').digest('base64')
    expect(isWellFormedShopifySignature(digest)).toBe(true)
  })

  test('rejects a missing, empty, truncated or junk header', () => {
    for (const value of [null, '', 'abc', 'not base64 at all!']) {
      expect(isWellFormedShopifySignature(value)).toBe(false)
    }
  })
})

describe('isFreshShopifyWebhook', () => {
  const now = Date.parse('2026-11-09T12:00:00Z')
  const at = (offsetMs: number) => new Date(now + offsetMs).toISOString()

  test('accepts a timestamp inside the window', () => {
    expect(isFreshShopifyWebhook(at(-1000), now)).toBe(true)
    expect(isFreshShopifyWebhook('2026-11-09T11:58:00.000000Z', now)).toBe(true)
  })

  test('parses the nanosecond fractions Shopify sends', () => {
    const real = '2023-03-29T18:00:27.877041743Z'
    const at = Date.parse('2023-03-29T18:00:27.877Z')
    expect(isFreshShopifyWebhook(real, at + 1000)).toBe(true)
    expect(isFreshShopifyWebhook(real, at + WEBHOOK_FRESHNESS_MS + 1000)).toBe(
      false
    )
  })

  test('rejects a stale timestamp', () => {
    expect(isFreshShopifyWebhook(at(-WEBHOOK_FRESHNESS_MS - 1000), now)).toBe(
      false
    )
  })

  test('rejects a timestamp too far in the future', () => {
    expect(isFreshShopifyWebhook(at(WEBHOOK_FRESHNESS_MS + 1000), now)).toBe(
      false
    )
  })

  test('rejects a missing or unparseable timestamp', () => {
    for (const value of [null, '', 'yesterday']) {
      expect(isFreshShopifyWebhook(value, now)).toBe(false)
    }
  })
})

describe('createSeenSet', () => {
  test('rejects a batch containing a key it has seen, recording nothing', () => {
    const seen = createSeenSet()
    expect(seen.rememberAll(['a', 'b'])).toBe(true)
    expect(seen.rememberAll(['c', 'a'])).toBe(false)
    expect(seen.rememberAll(['c'])).toBe(true)
  })

  test('forget makes keys acceptable again', () => {
    const seen = createSeenSet()
    seen.rememberAll(['a'])
    seen.forget(['a'])
    expect(seen.rememberAll(['a'])).toBe(true)
  })

  test('forgets the oldest key past its limit', () => {
    const seen = createSeenSet(2)
    seen.rememberAll(['a'])
    seen.rememberAll(['b'])
    seen.rememberAll(['c'])
    expect(seen.rememberAll(['a'])).toBe(true)
  })
})
