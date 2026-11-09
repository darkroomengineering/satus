import { describe, expect, test } from 'bun:test'
import { createHmac } from 'node:crypto'

import { isValidShopifySignature } from './webhook-signature'

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
