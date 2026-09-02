/**
 * Unit tests for the Shopify client's store-domain normalization.
 *
 * Covers H1: a scheme-less `SHOPIFY_STORE_DOMAIN` (the documented format,
 * e.g. "your-store.myshopify.com") previously produced a scheme-less fetch
 * URL that native `fetch` rejects with "Failed to parse URL".
 *
 * Run with: bun test lib/integrations/shopify/client.test.ts
 */

import { afterAll, afterEach, describe, expect, test } from 'bun:test'

import { normalizeStoreDomain, shopifyFetch } from './client'
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

// Bun's `fetch` type is a call signature plus a `preconnect` static method;
// delegating to the real `fetch.preconnect` keeps stubs structurally
// assignable to `globalThis.fetch` without an unsafe cast.
function toFetchStub(
  impl: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>
): typeof fetch {
  return Object.assign(impl, { preconnect: fetch.preconnect })
}

/**
 * A minimal step-sequenced `fetch` stub for the retry tests below. No module
 * mocking: this replaces the real `globalThis.fetch` global for the duration
 * of a test (restored in `afterEach`), the same pattern `test-setup.ts` uses
 * to swap network globals in and out around happy-dom registration.
 */
function mockFetchSequence(
  steps: { status: number; headers?: Record<string, string>; body?: unknown }[]
) {
  let callCount = 0
  const callTimes: number[] = []
  const fetch = toFetchStub(async () => {
    callTimes.push(Date.now())
    const step = steps[Math.min(callCount, steps.length - 1)]
    callCount++
    if (!step) throw new Error('mockFetchSequence: no step configured')
    return new Response(
      step.body === undefined ? null : JSON.stringify(step.body),
      { status: step.status, ...(step.headers && { headers: step.headers }) }
    )
  })
  return {
    fetch,
    getCallCount: () => callCount,
    getCallTimes: () => callTimes,
  }
}

describe('shopifyFetch retry-with-backoff', () => {
  const originalFetch = globalThis.fetch
  const originalDomain = process.env.SHOPIFY_STORE_DOMAIN
  const originalToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN

  // isConfigured('shopify') re-reads process.env on every call, so a dummy
  // pair here is enough to pass the gate — the mocked fetch below ignores
  // the request URL entirely.
  process.env.SHOPIFY_STORE_DOMAIN = 'test-store.myshopify.com'
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = 'test-token'

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  afterAll(() => {
    if (originalDomain === undefined) {
      delete process.env.SHOPIFY_STORE_DOMAIN
    } else {
      process.env.SHOPIFY_STORE_DOMAIN = originalDomain
    }
    if (originalToken === undefined) {
      delete process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
    } else {
      process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = originalToken
    }
  })

  test('429 then 200 succeeds after one retry, honoring Retry-After', async () => {
    const mock = mockFetchSequence([
      { status: 429, headers: { 'Retry-After': '1' } },
      { status: 200, body: { data: { shop: { name: 'ok' } } } },
    ])
    globalThis.fetch = mock.fetch

    const result = await shopifyFetch({ query: '{ shop { name } }' })

    expect(result.body.data).toEqual({ shop: { name: 'ok' } })
    expect(mock.getCallCount()).toBe(2)
    const [first, second] = mock.getCallTimes()
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    // Retry-After: 1 means ~1000ms between attempts; allow generous slack
    // for CI scheduling jitter without asserting exact wall time.
    expect((second as number) - (first as number)).toBeGreaterThanOrEqual(900)
  })

  test('503 twice then 200 succeeds after two retries', async () => {
    const mock = mockFetchSequence([
      { status: 503 },
      { status: 503 },
      { status: 200, body: { data: { shop: { name: 'ok' } } } },
    ])
    globalThis.fetch = mock.fetch

    const result = await shopifyFetch({ query: '{ shop { name } }' })

    expect(result.body.data).toEqual({ shop: { name: 'ok' } })
    expect(mock.getCallCount()).toBe(3)
  })

  test('429 on all attempts throws the rate-limited message after exactly 3 attempts', async () => {
    const mock = mockFetchSequence([
      { status: 429, headers: { 'Retry-After': '0' } },
    ])
    globalThis.fetch = mock.fetch

    await expect(shopifyFetch({ query: '{ shop { name } }' })).rejects.toThrow(
      /rate limited \(429\)/
    )
    expect(mock.getCallCount()).toBe(3)
  })

  test('401 throws immediately with a single attempt (no retry)', async () => {
    const mock = mockFetchSequence([{ status: 401 }])
    globalThis.fetch = mock.fetch

    await expect(shopifyFetch({ query: '{ shop { name } }' })).rejects.toThrow(
      /auth failed \(401\)/
    )
    expect(mock.getCallCount()).toBe(1)
  })

  test('an aborted attempt is not retried', async () => {
    let callCount = 0
    globalThis.fetch = toFetchStub(async () => {
      callCount++
      throw new DOMException('Aborted', 'AbortError')
    })

    await expect(shopifyFetch({ query: '{ shop { name } }' })).rejects.toThrow()
    expect(callCount).toBe(1)
  })
})

describe('shopifyFetch', () => {
  test('throws a descriptive error instead of hitting the network when Shopify is not configured', async () => {
    const originalDomain = process.env.SHOPIFY_STORE_DOMAIN
    const originalToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN

    // Force an invalid (empty) config regardless of the local/CI env, so
    // isConfigured('shopify') is deterministically false for this test.
    process.env.SHOPIFY_STORE_DOMAIN = ''
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = ''

    try {
      await expect(
        shopifyFetch({ query: '{ shop { name } }' })
      ).rejects.toThrow(/Shopify is not configured/)
    } finally {
      if (originalDomain === undefined) {
        delete process.env.SHOPIFY_STORE_DOMAIN
      } else {
        process.env.SHOPIFY_STORE_DOMAIN = originalDomain
      }
      if (originalToken === undefined) {
        delete process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
      } else {
        process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = originalToken
      }
    }
  })
})
