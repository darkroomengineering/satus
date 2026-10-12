import type { ClientReturn, QueryParams } from 'next-sanity'
import { cacheLife, cacheTag } from 'next/cache'

import { client } from './client'

// One tag for all content: per-type tags would miss a page that shows a
// referenced document of another type.
export const SANITY_CACHE_TAG = 'sanity'

/**
 * Published content only, never drafts. For reads outside a page request,
 * like the sitemap's routes, where draft mode can't be read; `sanityFetch`
 * calls it for every published read.
 *
 * Cached under the `sanity` tag until the publish webhook
 * (`app/api/revalidate`) expires it. `cacheLife('max')` means nothing else
 * expires it for 30 days. Cost: a project whose webhook is missing or broken
 * serves edits up to a month late, with no error anywhere.
 *
 * The `'use cache'` entry is the only cache layer: the inner fetch passes
 * `cache: 'no-store'` so the Data Cache doesn't keep a second, untagged copy.
 */
export async function sanityFetchPublished<const QueryString extends string>({
  query,
  params = {},
}: {
  query: QueryString
  params?: QueryParams
}): Promise<ClientReturn<QueryString, unknown> | null> {
  'use cache'
  cacheTag(SANITY_CACHE_TAG)
  cacheLife('max')

  if (!client) return null

  return client.fetch(query, params, {
    perspective: 'published',
    stega: false,
    cache: 'no-store',
  })
}
