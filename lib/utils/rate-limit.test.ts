import { describe, expect, it } from 'bun:test'

import { getClientIP, getIPFromHeaders, rateLimit } from './rate-limit'

// Unique per test: the in-memory store is shared across tests.
let counter = 0
function uniqueId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${counter++}`
}

describe('rateLimit', () => {
  it('should allow requests within the limit', () => {
    const id = uniqueId()
    const config = { limit: 5, windowSeconds: 60 }

    const result = rateLimit(id, config)
    expect(result.success).toBe(true)
    expect(result.limit).toBe(5)
    expect(result.remaining).toBe(4)
  })

  it('should decrement remaining count on each request', () => {
    const id = uniqueId()
    const config = { limit: 5, windowSeconds: 60 }

    const r1 = rateLimit(id, config)
    expect(r1.remaining).toBe(4)

    const r2 = rateLimit(id, config)
    expect(r2.remaining).toBe(3)

    const r3 = rateLimit(id, config)
    expect(r3.remaining).toBe(2)
  })

  it('should block requests after limit is reached', () => {
    const id = uniqueId()
    const config = { limit: 3, windowSeconds: 60 }

    rateLimit(id, config)
    rateLimit(id, config)
    rateLimit(id, config)

    const blocked = rateLimit(id, config)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('should include resetIn in the result', () => {
    const id = uniqueId()
    const config = { limit: 5, windowSeconds: 60 }

    const result = rateLimit(id, config)
    expect(result.resetIn).toBeGreaterThan(0)
    expect(result.resetIn).toBeLessThanOrEqual(60)
  })

  it('should track different identifiers independently', () => {
    const id1 = uniqueId('user-a')
    const id2 = uniqueId('user-b')
    const config = { limit: 2, windowSeconds: 60 }

    rateLimit(id1, config)
    rateLimit(id1, config)
    const blocked1 = rateLimit(id1, config)
    expect(blocked1.success).toBe(false)

    const result2 = rateLimit(id2, config)
    expect(result2.success).toBe(true)
  })

  it('should reset after window expires', async () => {
    const id = uniqueId()
    const config = { limit: 1, windowSeconds: 1 }

    const r1 = rateLimit(id, config)
    expect(r1.success).toBe(true)

    const r2 = rateLimit(id, config)
    expect(r2.success).toBe(false)

    await new Promise((resolve) => setTimeout(resolve, 1100))

    const r3 = rateLimit(id, config)
    expect(r3.success).toBe(true)
  })

  it('should have remaining never go below 0', () => {
    const id = uniqueId()
    const config = { limit: 2, windowSeconds: 60 }

    rateLimit(id, config)
    rateLimit(id, config)
    const r3 = rateLimit(id, config)
    const r4 = rateLimit(id, config)

    expect(r3.remaining).toBe(0)
    expect(r4.remaining).toBe(0)
  })
})

// `getClientIP` only hands the request's headers to `getIPFromHeaders`, which
// owns the header priority and parsing tested below.
describe('getClientIP', () => {
  it("should read the IP from the request's headers", () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    })
    expect(getClientIP(request)).toBe('192.168.1.1')
  })
})

describe('getIPFromHeaders', () => {
  const cases: [string, Record<string, string>, string | null][] = [
    [
      'return null when no IP headers are present (headerless visitor)',
      {},
      null,
    ],
    [
      'return null when x-forwarded-for is present but empty',
      { 'x-forwarded-for': '' },
      null,
    ],
    [
      'return null when x-forwarded-for is only whitespace before the first comma',
      { 'x-forwarded-for': '  ,10.0.0.1' },
      null,
    ],
    [
      'extract IP from x-forwarded-for',
      { 'x-forwarded-for': '192.168.1.1' },
      '192.168.1.1',
    ],
    [
      'extract first IP from comma-separated x-forwarded-for',
      { 'x-forwarded-for': '10.0.0.1, 192.168.1.1, 172.16.0.1' },
      '10.0.0.1',
    ],
    [
      'trim whitespace from x-forwarded-for',
      { 'x-forwarded-for': '  10.0.0.1  , 192.168.1.1' },
      '10.0.0.1',
    ],
    [
      'extract IP from cf-connecting-ip header (Cloudflare)',
      { 'cf-connecting-ip': '203.0.113.50' },
      '203.0.113.50',
    ],
    [
      'extract IP from x-real-ip header',
      { 'x-real-ip': '198.51.100.10' },
      '198.51.100.10',
    ],
    [
      'prioritize x-forwarded-for over cf-connecting-ip',
      { 'x-forwarded-for': '10.0.0.1', 'cf-connecting-ip': '203.0.113.50' },
      '10.0.0.1',
    ],
    [
      'prioritize cf-connecting-ip over x-real-ip',
      { 'cf-connecting-ip': '203.0.113.50', 'x-real-ip': '198.51.100.10' },
      '203.0.113.50',
    ],
    ['handle IPv6 addresses', { 'x-forwarded-for': '::1' }, '::1'],
  ]

  it.each(cases)('should %s', (_name, headers, expected) => {
    expect(getIPFromHeaders(new Headers(headers))).toBe(expected)
  })
})
