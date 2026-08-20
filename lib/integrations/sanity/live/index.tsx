import type { ClientReturn, ContentSourceMap, QueryParams } from 'next-sanity'
import {
  defineLive,
  type LivePerspective,
  type StrictDefinedFetchType,
  type StrictDefinedLiveProps,
} from 'next-sanity/live'
import { cacheTag } from 'next/cache'
import type { ComponentType } from 'react'
import { z } from 'zod'

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
 * Tag names the Sanity webhook revalidates, derived from a fetch result.
 * `app/api/revalidate/route.ts` calls `revalidateTag(_type)` and
 * `revalidateTag(`${_type}:${slug}`)`, so a cache entry must carry those
 * exact tags to be invalidated when an editor publishes.
 *
 * This alone is not enough to make revalidation work for every result: see
 * `tagsForIntent` below for the null/empty-result case.
 */
// A Sanity document's shape is arbitrary per-query, so this only describes
// the two fields `tagsForResult` reads — everything else is ignored, and a
// document missing `_type` (or not an object at all) is simply skipped.
const sanityTagFieldsSchema = z.object({
  _type: z.string(),
  slug: z.object({ current: z.string().optional() }).nullish(),
})

function tagsForResult(data: unknown[]): string[] {
  const tags = new Set<string>()

  for (const doc of data) {
    const parsed = sanityTagFieldsSchema.safeParse(doc)
    if (!parsed.success) continue
    const { _type, slug } = parsed.data
    tags.add(_type)
    if (slug?.current) tags.add(`${_type}:${slug.current}`)
  }

  return [...tags]
}

/**
 * Tag names derived from the query's INTENT (the requested document type,
 * plus `type:slug` when a slug param was passed) rather than from the fetch
 * result.
 *
 * `tagsForResult` alone leaves a hole: a query for a document that doesn't
 * exist yet (or a filter that currently matches nothing) returns `null`/`[]`,
 * which carries zero tags. The publish webhook fires `revalidateTag('page')` /
 * `revalidateTag('page:home')` (see `app/api/revalidate/route.ts`) regardless
 * of whether anything was cached under those tags, so a cached miss with no
 * intent tags can never be invalidated — the page 404s until the cache entry
 * expires on its own, even though the editor just published the fix.
 *
 * Every GROQ query in this repo filters its target type as a literal
 * `_type == "..."` (see `lib/integrations/sanity/queries.ts`), so the type is
 * read off the query string itself rather than requiring a separate
 * declaration at each call site. `slug` is read the same way every call site
 * already passes it: a flat `params.slug` string (not the nested
 * `{ current }` shape the webhook payload uses — that shape is Sanity's
 * document field, not the fetch param).
 */
const slugParamSchema = z.object({ slug: z.string().min(1) })

function tagsForIntent(
  query: string,
  params: QueryParams | undefined
): string[] {
  const typeMatch = query.match(/_type\s*==\s*['"]([^'"]+)['"]/)
  if (!typeMatch?.[1]) return []

  const type = typeMatch[1]
  const tags = [type]

  const parsedParams = slugParamSchema.safeParse(params)
  if (parsedParams.success) {
    tags.push(`${type}:${parsedParams.data.slug}`)
  }

  return tags
}

/**
 * The narrow slice of `SanityClient` this module actually calls. Kept
 * separate from the full class so tests can supply a plain fixture object
 * instead of asserting one into the full, many-method `SanityClient` shape.
 * A real `SanityClient` instance already satisfies this structurally.
 */
export interface FetchClient {
  fetch: (
    query: string,
    params?: QueryParams
  ) => Promise<ClientReturn<string, unknown>>
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
 *
 * Tags the surrounding cache entry the same way the live fetch does, so the
 * revalidation webhook still invalidates this content on publish. Without
 * that, a project on this path would serve a page until its cache profile
 * expired no matter how often the document changed.
 *
 * `perspective` and `stega` are accepted and ignored: both need a token this
 * path does not have, so it always serves published, un-annotated content.
 */
export function createPublishedFetch(
  sanityClient: FetchClient
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
    const rawData = params
      ? await sanityClient.fetch(options.query, params)
      : await sanityClient.fetch(options.query)
    // SAFETY: `rawData` is whatever the configured Sanity dataset returns for
    // an arbitrary GROQ query — `ClientReturn` can only resolve a concrete
    // shape for query strings covered by generated `SanityQueries` typegen,
    // which this generic `QueryString` type parameter isn't.
    const data = rawData as ClientReturn<QueryString, unknown>

    const dataList = Array.isArray(rawData) ? rawData : [rawData]
    const tags = [
      ...new Set([
        ...(options.tags ?? []),
        ...tagsForIntent(options.query, params),
        ...tagsForResult(dataList),
      ]),
    ]

    // Callers run this inside `'use cache'`, where `cacheTag` is legal and
    // required for the webhook to reach this entry. The unit tests call the
    // fetch directly, outside any cache scope, where it throws — tagging is
    // an optimisation for the cached path, never a correctness requirement
    // of the fetch itself.
    try {
      for (const tag of tags) cacheTag(tag)
    } catch {
      // Not inside a `'use cache'` scope; nothing to tag.
    }

    return { data, sourceMap: null, tags }
  }
}

/**
 * Stub fetch used when Sanity isn't configured at all. Returns null data —
 * which every typegen query result already models — instead of throwing.
 */
export function createStubFetch(): StrictDefinedFetchType {
  return async function stubFetch<const QueryString extends string>(_options: {
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
    return {
      // SAFETY: Sanity isn't configured at all, so every call returns no
      // data regardless of the query — `null` already models "no result"
      // for every typegen query result, but `ClientReturn`'s conditional
      // type can't be resolved for a generic `QueryString` inside this
      // function body.
      data: null as ClientReturn<QueryString, unknown>,
      sourceMap: null,
      tags: [],
    }
  }
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
