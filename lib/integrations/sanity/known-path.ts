import { draftMode } from 'next/headers'

import { env } from '@/lib/env'
import { getCmsRoutes } from '@/lib/seo/routes'

/**
 * Whether a request for a CMS-backed path (`/about`, `/articles/x`) should go
 * on to fetch its document. Call it before the per-slug `sanityFetch` in any
 * route that renders per request from a URL segment.
 *
 * Outside draft mode, a per-slug read is cached in the Data Cache under its
 * query and params, and a slug with no document caches a `null`. Every
 * random slug would then write one more entry, so anyone could fill the
 * cache (on Vercel the Data Cache is shared by a team's projects and evicts
 * least recently used entries). Checking the path against the published
 * route list, one cached entry already read by the sitemap, keeps unknown
 * slugs from reaching Sanity or the cache.
 *
 * Draft mode skips the check: the list is published-only, so an unpublished
 * draft would 404 in the Presentation preview, and draft reads are uncached
 * anyway. Same condition as `sanityFetch`'s draft branch.
 *
 * Cost: a published document that `getCmsRoutes` drops (a dot in its slug,
 * or a field that fails its schema) 404s at its own URL, matching the
 * sitemap, where before it rendered. Slugs colliding with a static route
 * never reach these pages, so dropping those changes nothing. When Sanity is
 * configured but failing, `getCmsRoutes` throws and the page errors, as the
 * per-slug fetch already did.
 */
export async function isKnownCmsPath(path: string): Promise<boolean> {
  const { isEnabled: isDraftMode } = await draftMode()
  if (isDraftMode && env.SANITY_API_READ_TOKEN) return true

  const routes = await getCmsRoutes()
  return routes.some((route) => route.path === path)
}
