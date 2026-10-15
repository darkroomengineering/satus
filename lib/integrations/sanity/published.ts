import type { ClientReturn, QueryParams } from 'next-sanity'

import { client } from './client'

// One tag for all content: per-type tags would miss a page that shows a
// referenced document of another type.
export const SANITY_CACHE_TAG = 'sanity'

const THIRTY_DAYS = 60 * 60 * 24 * 30

/**
 * Published content only, never drafts. For reads outside a page request,
 * like the sitemap's routes, where draft mode can't be read; `sanityFetch`
 * calls it for every published read.
 *
 * Cached in Next's Data Cache under the `sanity` tag until the publish
 * webhook (`app/api/revalidate`) expires it, with a 30-day revalidation as
 * the only other expiry (the same lifetime `cacheLife('max')` gave). Cost: a
 * project whose webhook is missing or broken serves edits up to a month
 * late, with no error anywhere.
 */
export async function sanityFetchPublished<const QueryString extends string>({
  query,
  params = {},
}: {
  query: QueryString
  params?: QueryParams
}): Promise<ClientReturn<QueryString, unknown> | null> {
  if (!client) return null

  return client.fetch(query, params, {
    perspective: 'published',
    stega: false,
    next: { revalidate: THIRTY_DAYS, tags: [SANITY_CACHE_TAG] },
  })
}
