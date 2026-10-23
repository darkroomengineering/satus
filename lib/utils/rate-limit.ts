/**
 * In-memory rate limiter. Serverless limitation: the counter lives in a
 * module-level `Map`, scoped to one process/isolate. On Vercel (and any
 * horizontally-scaled host) requests spread across instances and regions, each
 * with its OWN counter, and cold starts reset the window. A client hitting N
 * instances effectively gets N× the limit. Treat this as best-effort,
 * per-instance throttling, NOT a global guarantee.
 *
 * Recorded decision: satus targets Vercel-first, where the platform overwrites
 * `x-forwarded-for` at the edge, so client spoofing of that header doesn't
 * apply and the in-memory store is accepted. Self-hosters behind their own
 * proxy must guarantee a trusted XFF chain themselves, and should swap `store`
 * for a durable backend (`@upstash/ratelimit` with Upstash Redis, any Redis /
 * KV) for anything security-critical. `store` is the single seam to swap.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

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

/** `identifier` is any unique key, e.g. `${ip}:login`. */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const entry = store.get(identifier)

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

  entry.count++

  return {
    success: true,
    limit: config.limit,
    remaining: Math.max(0, remaining),
    resetIn,
  }
}

/**
 * Whether `identifier` has used up its window, without counting this call.
 * For limits that should count only failures but refuse every attempt once
 * reached (see the password gate in `proxy.ts`).
 */
export function isRateLimited(
  identifier: string,
  config: RateLimitConfig
): boolean {
  const entry = store.get(identifier)
  return (
    entry !== undefined &&
    Date.now() <= entry.resetTime &&
    entry.count >= config.limit
  )
}

/**
 * Priority: x-forwarded-for → cf-connecting-ip → x-real-ip → null. `null`
 * means no IP header: callers must skip rate limiting rather than bucket these
 * requests together, or every headerless visitor shares one counter.
 */
export function getIPFromHeaders(headers: Pick<Headers, 'get'>): string | null {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null
  }

  const cfConnectingIP = headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }

  const realIP = headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  return null
}

export function getClientIP(request: Request): string | null {
  return getIPFromHeaders(request.headers)
}

export const rateLimiters = {
  /** Login, auth */
  strict: { limit: 5, windowSeconds: 60 },
  /** API routes */
  standard: { limit: 20, windowSeconds: 60 },
  /** General endpoints */
  relaxed: { limit: 60, windowSeconds: 60 },
} as const
