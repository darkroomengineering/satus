import { cacheSignal } from 'react'
import { z } from 'zod'

import { env } from '@/lib/env'
import { isConfigured } from '@/lib/integrations/registry'
import { fetchWithTimeout } from '@/utils/fetch'
import { parseApiResponse } from '@/utils/validation'

import { SHOPIFY_GRAPHQL_API_ENDPOINT } from './constants'
import type { ShopifyFetchOptions, ShopifyResponse } from './types'

/**
 * Normalizes a store domain into a single `https://` origin. The documented
 * value is scheme-less, but some setups include a scheme or trailing slash,
 * and `fetch` throws "Failed to parse URL" on a scheme-less host.
 *
 * Returns an empty string when `domain` is missing; callers gate on
 * `isConfigured('shopify')`, and this must never throw at module scope.
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

// One budget shared by all attempts of a shopifyFetch call: fetchWithTimeout's
// `timeout` is per attempt, so retries would otherwise stretch a Server
// Action's wait past 10s. Each attempt gets the remaining slice.
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

/** 250ms, then 500ms, each with +/-20% jitter. */
function backoffMs(attempt: number): number {
  const base = attempt === 0 ? 250 : 500
  const jitter = base * 0.2 * (Math.random() * 2 - 1)
  return base + jitter
}

// Rejects on abort so a retry never outlives an aborted cacheSignal/timeout.
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

// Caching policy belongs to the caller: catalog reads pass `tags` and
// `revalidate`, per-user/mutation calls pass cache: 'no-store'.
export async function shopifyFetch<T = unknown>({
  cache = 'force-cache',
  headers: customHeaders,
  query,
  tags,
  revalidate,
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
    // Aborts when the render this read belongs to ends, so an abandoned render
    // stops waiting on Shopify. Null outside a render (Server Actions, Route
    // Handlers).
    // SAFETY: typed as an opaque `CacheSignal`, but React returns a real
    // AbortSignal (or null) at runtime.
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
        ...((tags || revalidate !== undefined) && {
          next: {
            ...(tags && { tags }),
            ...(revalidate !== undefined && { revalidate }),
          },
        }),
      })

      const isRetryable =
        !result.ok &&
        RETRYABLE_STATUSES.has(result.status) &&
        attempt < MAX_RETRIES

      if (!isRetryable) break

      const delay =
        parseRetryAfterMs(result.headers.get('Retry-After')) ??
        backoffMs(attempt)

      // A shorter, doomed final attempt isn't worth making.
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

    // SAFETY: no dataSchema means the caller opted out of boundary
    // validation; T is the caller's contract, not verified here.
    const data = dataSchema
      ? parseApiResponse(dataSchema, envelope.data, 'Shopify Storefront data')
      : (envelope.data as T)

    return {
      status: result.status,
      body: { data },
    }
  } catch (e) {
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
