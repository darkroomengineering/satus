import { cacheSignal } from 'react'
import { z } from 'zod'
import { fetchWithTimeout } from '@/utils/fetch'
import { parseApiResponse } from '@/utils/validation'
import { SHOPIFY_GRAPHQL_API_ENDPOINT } from './constants'
import type { ShopifyFetchOptions, ShopifyResponse } from './types'

const endpoint = `${process.env.SHOPIFY_STORE_DOMAIN ?? ''}${SHOPIFY_GRAPHQL_API_ENDPOINT}`
const key = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ?? ''

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
}: ShopifyFetchOptions): Promise<ShopifyResponse<T>> {
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

    // `errors` is always absent past the throw above; omit it so the optional
    // property stays optional under exactOptionalPropertyTypes.
    const body = { data: envelope.data as T }

    return {
      status: result.status,
      body,
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
