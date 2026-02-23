import { cacheSignal } from 'react'
import { fetchWithTimeout } from '@/utils/fetch'
import { SHOPIFY_GRAPHQL_API_ENDPOINT } from './constants'
import type { EdgeNode, ShopifyFetchOptions, ShopifyResponse } from './types'

export const endpoint = `${process.env.SHOPIFY_STORE_DOMAIN || ''}${SHOPIFY_GRAPHQL_API_ENDPOINT}`
export const key = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN || ''
export const domain = process.env.SHOPIFY_STORE_DOMAIN || ''

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

    const body = (await result.json()) as {
      data: T
      errors?: Array<{ message: string }>
    }

    if (body.errors) {
      throw new Error(body.errors[0]?.message ?? 'Unknown Shopify API error')
    }

    return {
      status: result.status,
      body,
    }
  } catch (e) {
    // Handle both cache expiry aborts and timeouts
    if (e instanceof Error && e.name === 'AbortError') {
      console.log('Shopify request aborted (cache expired or timeout)')
    }

    const message = e instanceof Error ? e.message : 'Unknown error'
    const error = new Error(`Shopify fetch failed: ${message}`)
    error.cause = { originalError: e, query }
    throw error
  }
}

export const removeEdgesAndNodes = <T>(array: EdgeNode<T>): T[] => {
  return array.edges.map((edge) => edge?.node)
}
