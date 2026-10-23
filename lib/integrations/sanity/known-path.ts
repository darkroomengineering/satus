import { draftMode } from 'next/headers'

import { env } from '@/lib/env'
import { getCmsRoutes } from '@/lib/seo/routes'

/**
 * Whether a CMS-backed path (`/about`, `/articles/x`) should go on to fetch its
 * document. Call it before the per-slug `sanityFetch` in any route that
 * renders per request from a URL segment.
 *
 * Outside draft mode a per-slug read is cached under its query and params, and
 * a missing document caches a `null`, so random slugs would fill the Data
 * Cache (shared across a team's projects on Vercel, evicting least recently
 * used entries). Checking the published route list (one cached entry the
 * sitemap already reads) keeps unknown slugs from reaching Sanity or the cache.
 *
 * Draft mode skips the check: the list is published-only, so an unpublished
 * draft would 404 in Presentation. Same condition as `sanityFetch`'s draft
 * branch.
 *
 * Cost: a published document that `getCmsRoutes` drops (a dot in its slug, a
 * field failing its schema) 404s at its own URL, matching the sitemap. When
 * Sanity is configured but failing, `getCmsRoutes` throws and the page errors.
 */
export async function isKnownCmsPath(path: string): Promise<boolean> {
  const { isEnabled: isDraftMode } = await draftMode()
  if (isDraftMode && env.SANITY_API_READ_TOKEN) return true

  const routes = await getCmsRoutes()
  return routes.some((route) => route.path === path)
}
