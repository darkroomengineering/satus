/**
 * Unit tests for rate limiting utilities
 *
 * Tests the in-memory rate limiter, IP extraction from request headers,
 * and pre-configured rate limiter presets.
 *
 * Run with: bun test lib/utils/rate-limit.test.ts
 */

import { describe, expect, it } from 'bun:test'
import { getClientIP, rateLimit, rateLimiters } from './rate-limit'

/**
 * Helper to generate a unique identifier per test to avoid cross-test pollution
 * from the shared in-memory store.
 */
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

    // Use all 3 allowed requests
    rateLimit(id, config)
    rateLimit(id, config)
    rateLimit(id, config)

    // 4th request should be blocked
    const blocked = rateLimit(id, config)
    expect(blocked.success).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('should return correct limit value in result', () => {
    const id = uniqueId()
    const config = { limit: 10, windowSeconds: 30 }

    const result = rateLimit(id, config)
    expect(result.limit).toBe(10)
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

    // Exhaust id1
    rateLimit(id1, config)
    rateLimit(id1, config)
    const blocked1 = rateLimit(id1, config)
    expect(blocked1.success).toBe(false)

    // id2 should still be allowed
    const result2 = rateLimit(id2, config)
    expect(result2.success).toBe(true)
  })

  it('should reset after window expires', async () => {
    const id = uniqueId()
    // 1-second window for fast test
    const config = { limit: 1, windowSeconds: 1 }

    const r1 = rateLimit(id, config)
    expect(r1.success).toBe(true)

    // Should be blocked immediately
    const r2 = rateLimit(id, config)
    expect(r2.success).toBe(false)

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 1100))

    // Should be allowed again
    const r3 = rateLimit(id, config)
    expect(r3.success).toBe(true)
  })

  it('should handle limit of 1 correctly', () => {
    const id = uniqueId()
    const config = { limit: 1, windowSeconds: 60 }

    const r1 = rateLimit(id, config)
    expect(r1.success).toBe(true)
    expect(r1.remaining).toBe(0)

    const r2 = rateLimit(id, config)
    expect(r2.success).toBe(false)
    expect(r2.remaining).toBe(0)
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

describe('getClientIP', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    })
    expect(getClientIP(request)).toBe('192.168.1.1')
  })

  it('should extract first IP from comma-separated x-forwarded-for', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1, 172.16.0.1' },
    })
    expect(getClientIP(request)).toBe('10.0.0.1')
  })

  it('should trim whitespace from x-forwarded-for', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '  10.0.0.1  , 192.168.1.1' },
    })
    expect(getClientIP(request)).toBe('10.0.0.1')
  })

  it('should extract IP from cf-connecting-ip header (Cloudflare)', () => {
    const request = new Request('http://localhost', {
      headers: { 'cf-connecting-ip': '203.0.113.50' },
    })
    expect(getClientIP(request)).toBe('203.0.113.50')
  })

  it('should extract IP from x-real-ip header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-real-ip': '198.51.100.10' },
    })
    expect(getClientIP(request)).toBe('198.51.100.10')
  })

  it('should prioritize x-forwarded-for over cf-connecting-ip', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '10.0.0.1',
        'cf-connecting-ip': '203.0.113.50',
      },
    })
    expect(getClientIP(request)).toBe('10.0.0.1')
  })

  it('should prioritize cf-connecting-ip over x-real-ip', () => {
    const request = new Request('http://localhost', {
      headers: {
        'cf-connecting-ip': '203.0.113.50',
        'x-real-ip': '198.51.100.10',
      },
    })
    expect(getClientIP(request)).toBe('203.0.113.50')
  })

  it('should return "unknown" when no IP headers are present', () => {
    const request = new Request('http://localhost')
    expect(getClientIP(request)).toBe('unknown')
  })

  it('should handle IPv6 addresses', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '::1' },
    })
    expect(getClientIP(request)).toBe('::1')
  })
})

describe('rateLimiters presets', () => {
  it('strict should have limit of 5 per 60 seconds', () => {
    expect(rateLimiters.strict.limit).toBe(5)
    expect(rateLimiters.strict.windowSeconds).toBe(60)
  })

  it('standard should have limit of 20 per 60 seconds', () => {
    expect(rateLimiters.standard.limit).toBe(20)
    expect(rateLimiters.standard.windowSeconds).toBe(60)
  })

  it('relaxed should have limit of 60 per 60 seconds', () => {
    expect(rateLimiters.relaxed.limit).toBe(60)
    expect(rateLimiters.relaxed.windowSeconds).toBe(60)
  })

  it('strict should be the most restrictive', () => {
    expect(rateLimiters.strict.limit).toBeLessThan(rateLimiters.standard.limit)
    expect(rateLimiters.standard.limit).toBeLessThan(rateLimiters.relaxed.limit)
  })

  it('presets should work with rateLimit function', () => {
    const id = uniqueId('preset')
    const result = rateLimit(id, rateLimiters.standard)
    expect(result.success).toBe(true)
    expect(result.limit).toBe(20)
  })
})
