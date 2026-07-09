/**
 * Unit tests for the Shopify client's store-domain normalization.
 *
 * Covers H1: a scheme-less `SHOPIFY_STORE_DOMAIN` (the documented format,
 * e.g. "your-store.myshopify.com") previously produced a scheme-less fetch
 * URL that native `fetch` rejects with "Failed to parse URL".
 *
 * Run with: bun test lib/integrations/shopify/client.test.ts
 */

import { describe, expect, test } from 'bun:test'
import { normalizeStoreDomain } from './client'
import { SHOPIFY_GRAPHQL_API_ENDPOINT } from './constants'

describe('normalizeStoreDomain', () => {
  test('bare domain gets an https:// prefix', () => {
    expect(normalizeStoreDomain('your-store.myshopify.com')).toBe(
      'https://your-store.myshopify.com'
    )
  })

  test('domain already prefixed with https:// is left as-is', () => {
    expect(normalizeStoreDomain('https://your-store.myshopify.com')).toBe(
      'https://your-store.myshopify.com'
    )
  })

  test('domain prefixed with http:// is upgraded to https://', () => {
    expect(normalizeStoreDomain('http://your-store.myshopify.com')).toBe(
      'https://your-store.myshopify.com'
    )
  })

  test('trailing slash is stripped', () => {
    expect(normalizeStoreDomain('your-store.myshopify.com/')).toBe(
      'https://your-store.myshopify.com'
    )
  })

  test('https:// domain with trailing slash is normalized', () => {
    expect(normalizeStoreDomain('https://your-store.myshopify.com/')).toBe(
      'https://your-store.myshopify.com'
    )
  })

  test('multiple trailing slashes are stripped', () => {
    expect(normalizeStoreDomain('your-store.myshopify.com//')).toBe(
      'https://your-store.myshopify.com'
    )
  })

  test('undefined env does not throw and returns a falsy/dummy value', () => {
    expect(() => normalizeStoreDomain(undefined)).not.toThrow()
    expect(normalizeStoreDomain(undefined)).toBe('')
  })

  test('empty string does not throw and returns a falsy/dummy value', () => {
    expect(() => normalizeStoreDomain('')).not.toThrow()
    expect(normalizeStoreDomain('')).toBe('')
  })

  test('bare domain + endpoint constant produces a valid, parseable URL', () => {
    const endpoint = `${normalizeStoreDomain('your-store.myshopify.com')}${SHOPIFY_GRAPHQL_API_ENDPOINT}`
    expect(endpoint).toBe(
      'https://your-store.myshopify.com/api/2026-04/graphql.json'
    )
    expect(() => new URL(endpoint)).not.toThrow()
  })

  test('https:// domain + endpoint constant produces a valid, parseable URL', () => {
    const endpoint = `${normalizeStoreDomain('https://your-store.myshopify.com')}${SHOPIFY_GRAPHQL_API_ENDPOINT}`
    expect(endpoint).toBe(
      'https://your-store.myshopify.com/api/2026-04/graphql.json'
    )
    expect(() => new URL(endpoint)).not.toThrow()
  })
})
