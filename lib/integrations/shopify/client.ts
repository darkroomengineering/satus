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

export async function shopifyFetch<T = Record<string, unknown>>({
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
    const signal = cacheSignal()

    const result = await fetchWithTimeout(endpoint, {
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
      timeout: 10000, // 10 second timeout for Shopify API
      // Only pass signal if cacheSignal returns a non-null value
      // Cast to AbortSignal for type compatibility
      ...(signal && { signal: signal as AbortSignal }),
      ...(tags && { next: { tags } }),
    })

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
    const data = dataSchema
      ? parseApiResponse(dataSchema, envelope.data, 'Shopify Storefront data')
      : (envelope.data as T)

    return {
      status: result.status,
      body: { data },
    }
  } catch (e) {
    // Handle both cache expiry aborts and timeouts
    if (e instanceof Error && e.name === 'AbortError') {
      if (process.env.NODE_ENV === 'development') {
        console.log('Shopify request aborted (cache expired or timeout)')
      }
    }

    const message = e instanceof Error ? e.message : 'Unknown error'
    const error = new Error(`Shopify fetch failed: ${message}`)
    error.cause = { originalError: e, query }
    throw error
  }
}
