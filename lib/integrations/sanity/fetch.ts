import type { ClientReturn, QueryParams } from 'next-sanity'
import { resolvePerspectiveFromCookies } from 'next-sanity/live'
import { cookies, draftMode } from 'next/headers'

import { env } from '@/lib/env'

import { client } from './client'
import { sanityFetchPublished } from './published'

/**
 * The one way a page reads Sanity content. Call it straight from a Server
 * Component or `generateMetadata`; it sets its own caching, and the page and
 * its metadata share one cached response.
 *
 * Published content is cached until the publish webhook (see
 * `sanityFetchPublished`). In draft mode, with `SANITY_API_READ_TOKEN` set, it
 * reads the perspective Presentation picked (drafts by default, or a content
 * release), with stega markers and no cache.
 *
 * Returns `null` when Sanity isn't configured, or when nothing matches.
 */
export async function sanityFetch<const QueryString extends string>({
  query,
  params = {},
}: {
  query: QueryString
  params?: QueryParams
}): Promise<ClientReturn<QueryString, unknown> | null> {
  if (!client) return null

  const token = env.SANITY_API_READ_TOKEN
  const { isEnabled: isDraftMode } = await draftMode()
  if (isDraftMode && token) {
    // Presentation writes the editor's pick to a cookie; without one, drafts.
    const perspective = await resolvePerspectiveFromCookies({
      cookies: await cookies(),
    })
    return client.fetch(query, params, {
      perspective,
      token,
      stega: true,
      cache: 'no-store',
    })
  }

  return sanityFetchPublished({ query, params })
}
