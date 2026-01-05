import type { QueryParams } from 'next-sanity'
import { defineLive } from 'next-sanity/live'
import { cache } from 'react'
import { isSanityConfigured } from '~/integrations/check-integration'
import { client } from '../client'
import { privateToken, publicToken } from '../env'

/**
 * Sanity Live configuration
 *
 * When Sanity is not configured, provides stub implementations
 * that return empty data instead of throwing errors.
 */
const isConfigured = isSanityConfigured() && client

const liveExports = isConfigured
  ? defineLive({
      client: client!,
      browserToken: publicToken,
      serverToken: privateToken,
    })
  : null

const internalSanityFetch =
  liveExports?.sanityFetch ?? (async () => ({ data: null }))

/**
 * Internal cached fetch using string keys for proper deduplication.
 * React's cache() compares arguments by reference, so we serialize
 * the query and params to create a stable cache key.
 */
const cachedFetch = cache(async (query: string, paramsJson: string) => {
  const params = paramsJson ? JSON.parse(paramsJson) : {}
  return internalSanityFetch({ query, params })
})

/**
 * Cached sanityFetch for request deduplication.
 * Ensures generateMetadata() and page() share the same request
 * when called with the same query and params.
 *
 * @see https://react.dev/reference/react/cache
 */
export const sanityFetch = async <T = unknown>({
  query,
  params = {},
}: {
  query: string
  params?: QueryParams
}): Promise<{ data: T | null }> => {
  return cachedFetch(query, JSON.stringify(params)) as Promise<{
    data: T | null
  }>
}

/**
 * Sanity Live component for real-time updates.
 * Returns null when Sanity is not configured.
 */
export const SanityLive = liveExports?.SanityLive ?? (() => null)
