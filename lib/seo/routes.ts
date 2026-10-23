import { defineQuery } from 'next-sanity'
import { z } from 'zod'

import { isConfigured } from '@/integrations/registry'
import { sanityFetchPublished } from '@/integrations/sanity/published'
import { urlForReference } from '@/integrations/sanity/utils/link'
import { MARKDOWN_HANDLER_PATH } from '@/lib/seo/markdown-path'
import { STATIC_ROUTES } from '@/lib/seo/route-catalog'

export type { StaticRoute } from '@/lib/seo/route-catalog'
export { STATIC_ROUTES }

// Route enumeration shared by `app/sitemap.ts` and `app/llms.txt/route.ts`,
// so the two never disagree about which URLs exist.

export interface ContentRoute {
  path: string
  label: string
  lastModified: Date
}

/**
 * Paths of routes with no CMS backing, emitted into `sitemap.xml`/`llms.txt`
 * (see `RESERVED_PATHS` for routes excluded without being advertised).
 * `(examples)` routes are left out of the catalog; each example page sets
 * `robots: { index: false, follow: false }` itself, because a `robots.txt`
 * disallow would block the crawl a noindex directive needs to be read.
 */
const staticPaths = new Set(STATIC_ROUTES.map((route) => route.path))

/**
 * First-segment routes outside the `[...slug]` catch-all that win over it but
 * are never advertised; they only exclude colliding CMS slugs. Without an
 * entry, a CMS document slugged `studio` would resolve to `/studio` via
 * `urlForReference` and be emitted although that path serves something else.
 * `/agent-content` is the internal Markdown handler `proxy.ts` rewrites to
 * (`MACHINE_PATHS` in `proxy.ts`); a CMS doc slugged `agent-content` would be
 * advertised while direct requests 404. `/api` needs no entry: no route at
 * that root segment, so it falls through to the catch-all.
 */
const RESERVED_PATHS = new Set([
  '/studio',
  '/sanity',
  '/webgl',
  MARKDOWN_HANDLER_PATH,
])

// Permissive (`nullable()`) because it validates a hand-written query, not a
// typegen'd one; malformed documents are skipped per entry.
const routableDocumentSchema = z.object({
  _type: z.enum(['page', 'article']),
  title: z.string().nullable(),
  // A dot is a valid Sanity slug character but collides with proxy.ts's
  // FILE_EXTENSION heuristic (`/\/[^/]+\.[^/]+$/`), which treats a dotted last
  // segment as a static asset and skips Markdown negotiation.
  slug: z
    .object({ current: z.string().refine((value) => !value.includes('.')) })
    .nullable(),
  _updatedAt: z.string(),
})

const routableContentQuery = defineQuery(`
  *[_type in ["page", "article"] && defined(slug.current)] {
    _type,
    title,
    slug,
    _updatedAt
  }
`)

/**
 * Turns the raw Sanity result into routes, skipping malformed documents one
 * at a time instead of failing the batch.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- this IS the I/O boundary: the untyped Sanity result is validated per entry below
export function buildRoutesFromDocuments(data: unknown): ContentRoute[] {
  if (!Array.isArray(data)) return []

  const routes = new Map<string, ContentRoute>()

  for (const rawDoc of data) {
    // Per entry, not `z.array(...).safeParse`: that fails on the first
    // malformed document and drops every valid route.
    const parsedDoc = routableDocumentSchema.safeParse(rawDoc)
    if (!parsedDoc.success) continue
    const doc = parsedDoc.data

    if (!doc.slug) continue

    const lastModified = new Date(doc._updatedAt)
    if (Number.isNaN(lastModified.getTime())) continue

    const path = urlForReference({
      type: 'internal',
      internalLink: { _type: doc._type, slug: doc.slug },
    })

    // '#' is unresolvable. A `staticPaths` hit is a slug colliding with a
    // listed static route (a `page` slugged `ai` resolves to `/ai`).
    if (path === '#' || staticPaths.has(path) || RESERVED_PATHS.has(path))
      continue

    routes.set(path, {
      path,
      label: doc.title ?? doc.slug.current,
      lastModified,
    })
  }

  return [...routes.values()]
}

export interface CmsRoutesResult {
  routes: ContentRoute[]
  /**
   * True when the CMS fetch failed rather than returning zero documents. Only
   * the per-request Markdown handler sees this, so it can answer 503 instead
   * of 404ing a route that exists once the outage clears.
   */
  degraded: boolean
}

/**
 * Every published `page`/`article`, resolved through `urlForReference` so the
 * sitemap and `/llms.txt` agree with on-page links. Unconfigured Sanity
 * returns no routes without fetching. A valid env can still point at a
 * missing project or dataset, so the fetch may throw; each accessor below
 * decides what that means. Published reads only: crawlers never see drafts.
 */
async function fetchCmsRoutesResult(): Promise<CmsRoutesResult> {
  if (!isConfigured('sanity')) return { routes: [], degraded: false }

  const data = await sanityFetchPublished({ query: routableContentQuery })
  return { routes: buildRoutesFromDocuments(data), degraded: false }
}

/**
 * Routes for sitemap.xml, llms.txt and `/ai`. Throws when Sanity is
 * configured but the fetch fails.
 *
 * They are cached under the `sanity` tag for 30 days; swallowing the error
 * would cache a copy without CMS routes for that long, while throwing keeps
 * serving the last good copy during background revalidation.
 *
 * Cost: after a publish webhook expires the tag there is no copy left, so
 * during a Sanity outage those routes answer 500, as do CMS pages (they check
 * `isKnownCmsPath`). A build with Sanity unreachable fails unless a warm
 * `.next/cache` holds the fetch.
 *
 * `load` is a test seam (a failing loader instead of module mocking).
 */
export async function getCmsRoutes(
  load: () => Promise<CmsRoutesResult> = fetchCmsRoutesResult
): Promise<ContentRoute[]> {
  return (await load()).routes
}

/**
 * Outage-aware accessor for the per-request Markdown handler
 * (markdown-document.ts): a failed fetch returns `degraded: true` instead of
 * throwing. `load` is the same test seam as `getCmsRoutes`'s.
 */
export async function getCmsRoutesResult(
  load: () => Promise<CmsRoutesResult> = fetchCmsRoutesResult
): Promise<CmsRoutesResult> {
  try {
    return await load()
  } catch (error) {
    console.error(
      '[seo/routes] Sanity fetch failed, omitting CMS routes:',
      error
    )
    return { routes: [], degraded: true }
  }
}
