/**
 * Unit tests for runFormAction's check ordering.
 *
 * Rate limiting must run before Turnstile verification: the in-memory
 * counter is nearly free, while Turnstile makes an outbound POST to
 * Cloudflare's siteverify endpoint with a multi-second timeout. A request
 * the rate limiter already rejects must never reach Turnstile.
 *
 * next/headers and the Turnstile module are mocked because runFormAction
 * calls headers() outside of a real Next.js request scope, and because we
 * need to observe whether Turnstile was invoked without hitting the network.
 *
 * Run with: bun test lib/utils/form-action.test.ts
 */

import { describe, expect, mock, test } from 'bun:test'

let turnstileCalls = 0

void mock.module('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7' }),
}))

void mock.module('@/lib/integrations/turnstile', () => ({
  validateFormWithTurnstile: async () => {
    turnstileCalls++
    return { isValid: true, errors: [] }
  },
}))

const { runFormAction } = await import('./form-action')
const { z } = await import('zod')

const schema = z.object({ email: z.string() })

let counter = 0
function uniquePrefix(): string {
  return `form-action-test-${Date.now()}-${counter++}`
}

function makeFormData(): FormData {
  const formData = new FormData()
  formData.set('email', 'person@example.com')
  return formData
}

describe('runFormAction — rate limit gates Turnstile', () => {
  test('a request within the limit reaches Turnstile', async () => {
    turnstileCalls = 0
    const result = await runFormAction({
      rateLimitPrefix: uniquePrefix(),
      schema,
      formData: makeFormData(),
      rateLimiter: { limit: 1, windowSeconds: 60 },
      turnstile: true,
      run: async () => ({ status: 200, message: 'ok' }),
    })

    expect(result.status).toBe(200)
    expect(turnstileCalls).toBe(1)
  })

  test('a request that exhausts the rate limit never reaches Turnstile', async () => {
    turnstileCalls = 0
    const rateLimitPrefix = uniquePrefix()
    const rateLimiter = { limit: 1, windowSeconds: 60 }

    const first = await runFormAction({
      rateLimitPrefix,
      schema,
      formData: makeFormData(),
      rateLimiter,
      turnstile: true,
      run: async () => ({ status: 200, message: 'ok' }),
    })
    expect(first.status).toBe(200)
    expect(turnstileCalls).toBe(1)

    // Second request against the same key/window is throttled.
    const second = await runFormAction({
      rateLimitPrefix,
      schema,
      formData: makeFormData(),
      rateLimiter,
      turnstile: true,
      run: async () => ({ status: 200, message: 'ok' }),
    })

    expect(second.status).toBe(429)
    // Turnstile call count is unchanged — the throttled request never ran it.
    expect(turnstileCalls).toBe(1)
  })

  test('verification is opt-in, so a form action that does not ask for it is not blocked', async () => {
    // Turnstile rejects a request carrying no token at all, and this starter
    // ships no widget component — defaulting to on would break every form a
    // project writes with this helper before they wire Cloudflare's script.
    turnstileCalls = 0
    const result = await runFormAction({
      rateLimitPrefix: uniquePrefix(),
      schema,
      formData: makeFormData(),
      run: async () => ({ status: 200, message: 'ok' }),
    })

    expect(result.status).toBe(200)
    expect(turnstileCalls).toBe(0)
  })
})
