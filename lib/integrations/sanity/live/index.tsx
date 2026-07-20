import {
  type DefinedFetchType,
  type DefinedLiveProps,
  defineLive,
} from 'next-sanity/live'
import type { ComponentType } from 'react'
import { isConfigured } from '@/integrations/registry'
import { client } from '../client'
import { privateToken, publicToken } from '../env'

/**
 * Sanity Live configuration
 *
 * When Sanity is not configured, provides stub implementation
 * that returns null instead of throwing errors.
 *
 * Live/draft mode additionally requires a non-empty private token —
 * without it, `defineLive` would silently no-op or error deep inside
 * next-sanity rather than failing clearly. This gate only affects the
 * live/draft capability; published-content fetching via `client` does
 * not depend on `privateToken` and is unaffected.
 */
const sanityReady = isConfigured('sanity') && client
const sanityLiveReady = sanityReady && privateToken !== ''

const liveExports = sanityLiveReady
  ? defineLive({
      client: client!,
      browserToken: publicToken,
      serverToken: privateToken,
    })
  : null

/**
 * Standard sanityFetch function from next-sanity/live.
 * When Sanity is not configured, returns null data — which every
 * typegen query result already models. The stub is cast to
 * `DefinedFetchType` so query-result inference survives the union.
 */
export const sanityFetch: DefinedFetchType =
  liveExports?.sanityFetch ??
  ((async () => ({
    data: null,
    sourceMap: null,
    tags: [],
  })) as unknown as DefinedFetchType)

/**
 * Sanity Live component for real-time updates.
 * Returns null when Sanity is not configured.
 */
export const SanityLive: ComponentType<DefinedLiveProps> =
  liveExports?.SanityLive ?? (() => null)
