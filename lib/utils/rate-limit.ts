/**
 * Simple in-memory rate limiter
 *
 * ⚠️ Serverless / Vercel limitation — read before relying on this in prod:
 * the counter lives in a module-level `Map`, so it is scoped to a single
 * process/isolate. On Vercel (and any horizontally-scaled host) requests are
 * spread across multiple function instances and regions, each with its OWN
 * counter — and instances are recycled on cold starts. A client hitting N
 * instances effectively gets N× the limit, and a cold start resets the window.
 * Treat this as best-effort, per-instance throttling, NOT a global guarantee.
 *
 * For a durable, cross-instance limit, swap the `store` for a shared backend:
 * - `@upstash/ratelimit` with Upstash Redis (recommended on Vercel)
 * - any Redis / KV reachable from the function
 *
 * Works well as-is for: local development, single-server deployments, and
 * coarse per-isolate abuse-dampening at the edge.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60 * 1000 // 1 minute
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key)
    }
  }
  lastCleanup = now
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSeconds: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetIn: number
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 *
 * @example
 * ```ts
 * const result = rateLimit('192.168.1.1:login', { limit: 5, windowSeconds: 60 })
 * if (!result.success) {
 *   return new Response('Too many requests', { status: 429 })
 * }
 * ```
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const entry = store.get(identifier)

  // No existing entry or window expired - create new entry
  if (!entry || now > entry.resetTime) {
    store.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetIn: config.windowSeconds,
    }
  }

  // Within window - check limit
  const remaining = config.limit - entry.count - 1
  const resetIn = Math.ceil((entry.resetTime - now) / 1000)

  if (entry.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetIn,
    }
  }

  // Increment counter
  entry.count++

  return {
    success: true,
    limit: config.limit,
    remaining: Math.max(0, remaining),
    resetIn,
  }
}

/**
 * Extract client IP from a Headers object.
 * Works with Vercel, Cloudflare, and standard proxies.
 * Accepts both the Web API `Headers` and Next.js `ReadonlyHeaders`.
 *
 * Priority: x-forwarded-for → cf-connecting-ip → x-real-ip → 'unknown'
 */
export function getIPFromHeaders(headers: Pick<Headers, 'get'>): string {
  // Vercel / standard proxy
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown'
  }

  // Cloudflare
  const cfConnectingIP = headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  // Real IP header
  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  return 'unknown'
}

/**
 * Get client IP from a Request object.
 * Works with Vercel, Cloudflare, and standard proxies.
 */
export function getClientIP(request: Request): string {
  return getIPFromHeaders(request.headers)
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  /** Strict: 5 requests per minute (login, auth) */
  strict: { limit: 5, windowSeconds: 60 },
  /** Standard: 20 requests per minute (API routes) */
  standard: { limit: 20, windowSeconds: 60 },
  /** Relaxed: 60 requests per minute (general endpoints) */
  relaxed: { limit: 60, windowSeconds: 60 },
} as const
