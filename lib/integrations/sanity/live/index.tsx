import { defineLive } from 'next-sanity/live'
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

// Re-export sanityFetch directly when configured, or provide a stub
export const sanityFetch =
  liveExports?.sanityFetch ?? (async () => ({ data: null }))

/**
 * Sanity Live component for real-time updates.
 * Returns null when Sanity is not configured.
 */
export const SanityLive = liveExports?.SanityLive ?? (() => null)
