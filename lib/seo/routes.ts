import { defineQuery } from 'next-sanity'
import { z } from 'zod'

import { isConfigured } from '@/integrations/registry'
import { sanityFetchPublished } from '@/integrations/sanity/published'
import { urlForReference } from '@/integrations/sanity/utils/link'
import { MARKDOWN_HANDLER_PATH } from '@/lib/seo/markdown-path'
import { STATIC_ROUTES } from '@/lib/seo/route-catalog'

export { STATIC_ROUTES }
export type { StaticRoute } from '@/lib/seo/route-catalog'

/**
 * Route enumeration shared by `app/sitemap.ts` and `app/llms.txt/route.ts` —
 * the sitemap and the machine-readable content list must never disagree
 * about which URLs exist, so both read from here instead of keeping their
 * own copies.
 */

export interface ContentRoute {
  path: string
  label: string
  lastModified: Date
}

/**
 * Routes with no CMS backing. `/ai` has no link from the design, so
 * `app/sitemap.ts` is the only place crawlers discover it — see
 * `app/(site)/ai/page.tsx`, which reads the same catalog for the
 * human/agent-facing machine view.
 *
 * This list is what gets *advertised* — every entry here is emitted into
 * `sitemap.xml`/`llms.txt`. See `RESERVED_PATHS` below for routes that must
 * be excluded from CMS dedup without being advertised themselves.
 *
 * The `(examples)` route group (`/sanity`, `/webgl`) holds worked examples
 * for developers, not real site content — excluded here so they never appear
 * in the sitemap or the `/ai` machine view. Indexability is enforced on each
 * page itself: each example's `page.tsx` under `app/(site)/(examples)/`
 * sets `robots: { index: false, follow: false }`. A `robots.txt` disallow
 * would defeat that — it blocks the crawl a noindex directive needs in
 * order to be read.
 */
const staticPaths = new Set(STATIC_ROUTES.map((route) => route.path))

/**
 * Literal first-path-segment routes that live outside the `[...slug]`
 * catch-all and win over it at request time, but that have no
 * `sitemap.xml`/`llms.txt` presence of their own — so unlike `STATIC_ROUTES`
 * they are never emitted, only used to exclude colliding CMS slugs below.
 *
 * - `/studio` — `app/studio/[[...tool]]/page.tsx`, Sanity Studio.
 * - `/sanity` — `app/(site)/(examples)/sanity/page.tsx`, a Sanity wiring
 *   tutorial for developers, not real site content.
 * - `/webgl` — `app/(site)/(examples)/webgl/page.tsx`, the WebGL-follows-CSS
 *   example, same status.
 * - `/agent-content` — the internal Markdown negotiation handler proxy.ts
 *   rewrites to (`app/agent-content/route.ts`); a CMS doc slugged
 *   `agent-content` would otherwise be advertised in the sitemap/`/ai` while
 *   direct requests to it still 404 (see `MACHINE_PATHS` in `proxy.ts`).
 *
 * Without this, a CMS document slugged `studio` or `sanity` would resolve to
 * `/studio` or `/sanity` via `urlForReference` and get emitted into the
 * sitemap/llms.txt, even though the real route at that path serves something
 * else entirely. (`/api` needs no entry: there's no page/route at that root
 * segment, so it already falls through to the catch-all untouched.)
 */
const RESERVED_PATHS = new Set([
  '/studio',
  '/sanity',
  '/webgl',
  MARKDOWN_HANDLER_PATH,
])

/**
 * Every document type with a `slug` — kept permissive (`nullable()` fields)
 * because this validates a hand-written query rather than a typegen'd one;
 * malformed documents are skipped per-entry in `getCmsRoutes` rather than
 * failing the whole fetch.
 */
const routableDocumentSchema = z.object({
  _type: z.enum(['page', 'article']),
  title: z.string().nullable(),
  // A dot is a valid Sanity slug character but collides with proxy.ts's
  // FILE_EXTENSION heuristic (`/\/[^/]+\.[^/]+$/`): any dotted last path
  // segment is treated as a static asset and skips Markdown content
  // negotiation. Rejecting it here — same as any other malformed document —
  // keeps that heuristic correct for every routable document.
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
 * Turns the raw (`unknown`) Sanity query result into routes, skipping
 * malformed documents one at a time rather than failing the whole batch.
 * Pulled out of `getCmsRoutes` so the skip-per-entry behaviour is testable
 * without a network dependency.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- this IS the I/O boundary: the untyped Sanity result is validated per entry below
export function buildRoutesFromDocuments(data: unknown): ContentRoute[] {
  if (!Array.isArray(data)) return []

  const routes = new Map<string, ContentRoute>()

  for (const rawDoc of data) {
    // Validated per entry, not as a whole array: `z.array(...).safeParse`
    // fails closed on the FIRST malformed document, dropping every valid
    // route from the sitemap and `/llms.txt`. One bad document should only
    // cost that one document.
    const parsedDoc = routableDocumentSchema.safeParse(rawDoc)
    if (!parsedDoc.success) continue
    const doc = parsedDoc.data

    if (!doc.slug) continue

    const lastModified = new Date(doc._updatedAt)
    if (Number.isNaN(lastModified.getTime())) continue

    const path = urlForReference({
      linkType: 'internal',
      internalLink: { _type: doc._type, slug: doc.slug },
    })

    // `path === '#'` is unresolvable; a `staticPaths` hit means the document's
    // slug collides with an already-listed static route (e.g. a `page` with
    // slug `ai` resolves to `/ai`, which the static route already serves).
    // A `RESERVED_PATHS` hit means it collides with a route outside the
    // catch-all that isn't advertised in the sitemap at all (e.g. `studio`).
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
   * True when the CMS fetch failed rather than the CMS genuinely having zero
   * published `page`/`article` documents. Only the
   * Markdown handler sees this: it renders per request, so it can answer a
   * 503 instead of 404ing a route that would exist once the outage clears.
   */
  degraded: boolean
}

/**
 * Every published `page`/`article` document, resolved to the same URL
 * `urlForReference` (`@/integrations/sanity/utils/link`) uses for internal
 * links elsewhere in the app — so the sitemap and `/llms.txt` can never
 * disagree with on-page navigation about where a document lives.
 *
 * Returns `{ routes: [], degraded: false }` when Sanity isn't configured (a
 * fresh clone's default state): no fetch runs, and callers degrade to
 * `STATIC_ROUTES` only.
 *
 * A schema-valid env (`isConfigured`) doesn't guarantee the project/dataset
 * it points to exists or is reachable, so the fetch can throw (wrong project
 * ID, deleted dataset, network failure). It is left to throw here; each
 * accessor below decides what an outage means for its caller.
 *
 * Reads through `sanityFetchPublished`, which is cached under the `sanity`
 * tag until the publish webhook: crawlers never see draft content, so there's
 * no draft mode to branch on here, unlike a rendered page.
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
 * Those three are static, cached under the `sanity` tag with a 30-day
 * revalidate. Swallowing the error would store a copy without CMS routes for
 * up to 30 days. Throwing keeps the last good copy only for the 30-day
 * background revalidation, which serves the stale copy while it retries.
 *
 * Cost: after a publish webhook (`revalidateTag('sanity', { expire: 0 })`)
 * there is no copy left to serve, so during a Sanity outage every request to
 * `/sitemap.xml`, `/llms.txt` and `/ai` answers 500 until Sanity answers
 * again. A build with Sanity configured but unreachable fails, unless a warm
 * `.next/cache` still holds the routes fetch, which the build reuses; so
 * mostly a first or cache-cleared build. Also the published route list the
 * CMS pages check before fetching (`isKnownCmsPath`), so those pages error
 * during an outage too.
 *
 * `load` exists for tests, which pass a failing loader instead of mocking
 * the Sanity module; callers pass nothing.
 */
export async function getCmsRoutes(
  load: () => Promise<CmsRoutesResult> = fetchCmsRoutesResult
): Promise<ContentRoute[]> {
  return (await load()).routes
}

/**
 * Outage-aware accessor for the per-request Markdown handler
 * (markdown-document.ts): a failed fetch returns `degraded: true` instead of
 * throwing. See `CmsRoutesResult.degraded`. `load` is the same test seam as
 * `getCmsRoutes`'s.
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
