import { cacheSignal } from 'react'
import { z } from 'zod'

import { env } from '@/lib/env'
import { isConfigured } from '@/lib/integrations/registry'
import { fetchWithTimeout } from '@/utils/fetch'
import { parseApiResponse } from '@/utils/validation'

import { SHOPIFY_GRAPHQL_API_ENDPOINT } from './constants'
import type { ShopifyFetchOptions, ShopifyResponse } from './types'

/**
 * Normalize a Shopify store domain into a `https://` origin.
 *
 * The documented env value is scheme-less (`your-store.myshopify.com`), but
 * some setups store it with an existing `https://`/`http://` prefix and/or a
 * trailing slash. Native `fetch` throws "Failed to parse URL" on a scheme-less
 * host, so this always normalizes to a single `https://` prefix.
 *
 * Returns an empty string when `domain` is missing — the caller is
 * responsible for gating usage (e.g. via `isConfigured('shopify')`); this
 * helper must never throw at module scope.
 */
export function normalizeStoreDomain(domain: string | undefined): string {
  if (!domain) return ''
  const stripped = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  return stripped ? `https://${stripped}` : ''
}

const endpoint = `${normalizeStoreDomain(env.SHOPIFY_STORE_DOMAIN)}${SHOPIFY_GRAPHQL_API_ENDPOINT}`
const key = env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ?? ''

const shopifyEnvelopeSchema = z.object({
  data: z.unknown(),
  errors: z.array(z.object({ message: z.string() })).optional(),
})

// Shared across all attempts of a single shopifyFetch call: fetchWithTimeout
// applies its `timeout` per attempt, so retries would otherwise multiply the
// wall-clock time a Server Action waits past the original 10s budget. Each
// attempt gets the remaining slice of this fixed budget instead of a fresh
// 10s, keeping the total in line with what a caller already tolerates today.
const REQUEST_BUDGET_MS = 10000
const MAX_RETRIES = 2 // up to 3 attempts total
const RETRYABLE_STATUSES = new Set([429, 503])

/** Parses a `Retry-After` header (seconds or HTTP-date) into ms, capped at 5s. */
function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null
  const seconds = Number(header)
  if (!Number.isNaN(seconds)) return Math.max(0, Math.min(seconds * 1000, 5000))
  const dateMs = Date.parse(header)
  if (Number.isNaN(dateMs)) return null
  return Math.max(0, Math.min(dateMs - Date.now(), 5000))
}

/** Exponential backoff (250ms, 500ms) with +/-20% jitter for the given attempt index. */
function backoffMs(attempt: number): number {
  const base = attempt === 0 ? 250 : 500
  const jitter = base * 0.2 * (Math.random() * 2 - 1)
  return base + jitter
}

// Waits `ms`, but bails immediately (rejecting with the abort reason) if
// `signal` is already aborted or fires mid-wait, so a retry can never outlive
// an aborted cacheSignal/timeout.
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(
      signal.reason ?? new DOMException('Aborted', 'AbortError')
    )
  }
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timeoutId)
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
      },
      { once: true }
    )
  })
}

// cache-exempt: shared low-level wrapper used by both cached callers (which
// wrap it in 'use cache', e.g. products.ts) and uncached per-user/mutation
// callers (which pass cache: 'no-store', e.g. cart-operations.ts) — caching
// policy belongs to the caller, not this wrapper.
export async function shopifyFetch<T = unknown>({
  cache = 'force-cache',
  headers: customHeaders,
  query,
  tags,
  variables,
  dataSchema,
}: ShopifyFetchOptions<T>): Promise<ShopifyResponse<T>> {
  if (!isConfigured('shopify')) {
    const error = new Error(
      'Shopify fetch failed: Shopify is not configured (missing SHOPIFY_STORE_DOMAIN or SHOPIFY_STOREFRONT_ACCESS_TOKEN)'
    )
    error.cause = { query }
    throw error
  }

  try {
    // Use cacheSignal for automatic request cleanup on cache expiry
    // SAFETY: cacheSignal() is typed to return the opaque, memberless
    // `CacheSignal` marker interface, but React always hands back a real
    // AbortSignal (or null) at runtime — the empty interface just hides
    // the DOM shape from the public type.
    const signal = cacheSignal() as AbortSignal | null

    const deadline = Date.now() + REQUEST_BUDGET_MS

    let attempt = 0
    let result: Response
    for (;;) {
      result = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': key,
          ...customHeaders,
        },
        body: JSON.stringify({
          ...(query && { query }),
          ...(variables && { variables }),
        }),
        cache,
        timeout: Math.max(deadline - Date.now(), 0),
        ...(signal && { signal }),
        ...(tags && { next: { tags } }),
      })

      const isRetryable =
        !result.ok &&
        RETRYABLE_STATUSES.has(result.status) &&
        attempt < MAX_RETRIES

      if (!isRetryable) break

      const delay =
        parseRetryAfterMs(result.headers.get('Retry-After')) ??
        backoffMs(attempt)

      // Bail without sleeping once the shared budget can't absorb another
      // round trip — a shorter, doomed final attempt isn't worth making.
      if (deadline - Date.now() - delay <= 0) break

      await sleep(delay, signal ?? undefined)
      attempt++
    }

    if (!result.ok) {
      if (result.status === 401 || result.status === 403) {
        throw new Error(
          `Shopify Storefront API auth failed (${result.status}) — check SHOPIFY_STOREFRONT_ACCESS_TOKEN`
        )
      }
      if (result.status === 429) {
        const retryAfter = result.headers.get('Retry-After')
        throw new Error(
          `Shopify Storefront API rate limited (429)${retryAfter ? ` — retry after ${retryAfter}s` : ''}`
        )
      }
      throw new Error(
        `Shopify Storefront API request failed (${result.status} ${result.statusText})`
      )
    }

    const raw = await result.json()
    const envelope = parseApiResponse(
      shopifyEnvelopeSchema,
      raw,
      'Shopify Storefront'
    )

    if (envelope.errors) {
      throw new Error(
        envelope.errors[0]?.message ?? 'Unknown Shopify API error'
      )
    }

    // If a schema was provided, validate the payload at the boundary.
    // Otherwise, trust the cast (opt-in — callers without a schema are responsible
    // for ensuring T matches the actual response shape).
    // SAFETY: no dataSchema means the caller opted out of boundary
    // validation; T is asserted on the caller's contract, not verified here.
    const data = dataSchema
      ? parseApiResponse(dataSchema, envelope.data, 'Shopify Storefront data')
      : (envelope.data as T)

    return {
      status: result.status,
      body: { data },
    }
  } catch (e) {
    // Handle both cache expiry aborts and timeouts
    if (
      e instanceof Error &&
      e.name === 'AbortError' &&
      process.env.NODE_ENV === 'development'
    ) {
      console.log('Shopify request aborted (cache expired or timeout)')
    }

    const message = e instanceof Error ? e.message : 'Unknown error'
    const error = new Error(`Shopify fetch failed: ${message}`)
    error.cause = { originalError: e, query }
    throw error
  }
}
