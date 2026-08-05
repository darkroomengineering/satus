import type {
  ClientReturn,
  ContentSourceMap,
  QueryParams,
  SanityClient,
} from 'next-sanity'
import {
  defineLive,
  type LivePerspective,
  type StrictDefinedFetchType,
  type StrictDefinedLiveProps,
} from 'next-sanity/live'
import type { ComponentType } from 'react'

import { isConfigured } from '@/integrations/registry'

import { client } from '../client'
import { privateToken, publicToken } from '../env'

/** Which `sanityFetch` implementation a given configuration resolves to. */
export type SanityFetchMode = 'live' | 'published' | 'stub'

/**
 * Pure decision function for which `sanityFetch` implementation to use —
 * kept free of `defineLive`/the client instance so it's unit-testable
 * without invoking next-sanity's live wiring (which requires a real Next.js
 * RSC/`'use cache'` context to run).
 *
 * - `live`: Sanity is configured and a private token is set — full
 *   live/draft support via `defineLive`.
 * - `published`: Sanity is configured but no private token — published
 *   content still renders via a plain client-backed fetch; live/draft is
 *   unavailable.
 * - `stub`: Sanity is not configured (no projectId/dataset, or no client) —
 *   every fetch returns null data.
 */
export function resolveSanityFetchMode(options: {
  configured: boolean
  hasClient: boolean
  privateToken: string
}): SanityFetchMode {
  if (!options.configured || !options.hasClient) return 'stub'
  return options.privateToken !== '' ? 'live' : 'published'
}

/**
 * Published-content fetch built directly on the Sanity client — no
 * `serverToken`, no live/draft support. Used whenever a project has
 * projectId/dataset configured but no private token: published content
 * still renders, and only the live/draft capability is unavailable.
 *
 * Matches `StrictDefinedFetchType`'s call signature exactly so it's a
 * drop-in replacement for `defineLive`'s `sanityFetch` wherever it's called
 * (including inside `'use cache'` functions, which require `perspective`
 * and `stega` on every call under this repo's `strict: true` convention).
 */
export function createPublishedFetch(
  sanityClient: SanityClient
): StrictDefinedFetchType {
  return async function publishedFetch<
    const QueryString extends string,
  >(options: {
    query: QueryString
    params?: QueryParams | Promise<QueryParams>
    perspective: LivePerspective
    variant?: string
    stega: boolean
    tags?: string[]
    requestTag?: string
  }): Promise<{
    data: ClientReturn<QueryString, unknown>
    sourceMap: ContentSourceMap | null
    tags: string[]
  }> {
    const params = options.params ? await options.params : undefined
    const data = params
      ? await sanityClient.fetch(options.query, params)
      : await sanityClient.fetch(options.query)
    return { data, sourceMap: null, tags: options.tags ?? [] }
  }
}

/**
 * Stub fetch used when Sanity isn't configured at all. Returns null data —
 * which every typegen query result already models — instead of throwing.
 */
export function createStubFetch(): StrictDefinedFetchType {
  return (async () => ({
    data: null,
    sourceMap: null,
    tags: [],
  })) as unknown as StrictDefinedFetchType
}

/**
 * Sanity Live configuration
 *
 * When Sanity is not configured at all (no projectId/dataset), `sanityFetch`
 * is a stub that returns null instead of throwing errors.
 *
 * Live/draft mode additionally requires a non-empty private token — without
 * it, `defineLive` would silently no-op or error deep inside next-sanity
 * rather than failing clearly. Published-content fetching does not need the
 * private token: when it's missing, `sanityFetch` falls back to a plain
 * client-backed implementation so the site still renders, and only live/draft
 * degrades.
 */
const sanityFetchMode = resolveSanityFetchMode({
  configured: isConfigured('sanity'),
  hasClient: client !== null,
  privateToken,
})

const liveExports =
  sanityFetchMode === 'live'
    ? defineLive({
        client: client!,
        browserToken: publicToken,
        serverToken: privateToken,
        // Strict mode: `perspective`/`stega` required per fetch, `includeDrafts`
        // required on <SanityLive> — the calling convention this repo already
        // uses everywhere (see app/(site)/(examples)/sanity/page.tsx).
        strict: true,
      })
    : null

/**
 * Standard sanityFetch function from next-sanity/live.
 *
 * - Private token present: the live-enabled fetch from `defineLive`.
 * - Configured but no private token: the published-only fallback above.
 * - Not configured at all: a stub returning null data.
 */
export const sanityFetch: StrictDefinedFetchType =
  liveExports?.sanityFetch ??
  (sanityFetchMode === 'published'
    ? createPublishedFetch(client!)
    : createStubFetch())

/**
 * Sanity Live component for real-time updates.
 * Returns null when live/draft mode is unavailable (Sanity not configured,
 * or configured without a private token).
 */
export const SanityLive: ComponentType<StrictDefinedLiveProps> =
  liveExports?.SanityLive ?? (() => null)
