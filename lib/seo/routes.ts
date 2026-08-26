import { defineQuery } from 'next-sanity'
import { z } from 'zod'

import { isConfigured } from '@/integrations/registry'
import { sanityFetch } from '@/integrations/sanity/live'
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
 * The `(examples)` route group (`/sanity`) is a Sanity wiring tutorial for
 * developers, not real site content — excluded here so it never appears in
 * the sitemap or the `/ai` machine view. Indexability is enforced on the
 * page itself: `app/(site)/(examples)/sanity/page.tsx` sets `robots: {
 * index: false, follow: false }`. A `robots.txt` disallow would defeat that
 * — it blocks the crawl a noindex directive needs in order to be read.
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
const RESERVED_PATHS = new Set(['/studio', '/sanity', MARKDOWN_HANDLER_PATH])

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
   * True when the last fetch attempt failed (Sanity unreachable) rather
   * than the CMS genuinely having zero published `page`/`article`
   * documents. `getCmsRoutes` collapses both cases to `[]` on purpose —
   * sitemap/llms.txt/`/ai` must always respond, degraded or not — but the
   * Markdown handler needs to tell them apart to avoid 404ing a route that
   * would exist once the outage clears.
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
 * `'use cache'` is required: `sanityFetch` calls `cacheTag()` internally,
 * which Cache Components (`cacheComponents: true`) only allows inside a
 * `'use cache'` boundary — see `app/(site)/(examples)/sanity/page.tsx` for
 * the same constraint applied to a page-level fetch. `perspective`/`stega`
 * are hardcoded to the published, non-stega variant: crawlers never see
 * draft content, so there's no request-level (draft mode) state to branch
 * on here, unlike a rendered page.
 */
async function fetchCmsRoutesResult(): Promise<CmsRoutesResult> {
  'use cache'

  if (!isConfigured('sanity')) return { routes: [], degraded: false }

  // A schema-valid env (`isConfigured`) doesn't guarantee the project/dataset
  // it points to actually exists or is reachable — `sanityFetch` throws on a
  // Sanity API error (wrong project ID, deleted dataset, network failure).
  // Crawlers depend on `sitemap.xml`/`llms.txt` always responding, even for
  // the static routes, so a broken CMS connection degrades to no CMS routes
  // instead of taking the whole response down.
  let data: unknown
  try {
    ;({ data } = await sanityFetch({
      query: routableContentQuery,
      perspective: 'published',
      stega: false,
    }))
  } catch (error) {
    console.error(
      '[seo/routes] Sanity fetch failed, omitting CMS routes:',
      error
    )
    return { routes: [], degraded: true }
  }

  return { routes: buildRoutesFromDocuments(data), degraded: false }
}

/** Graceful-empty-on-failure accessor for sitemap.xml, llms.txt, and /ai. */
export async function getCmsRoutes(): Promise<ContentRoute[]> {
  return (await fetchCmsRoutesResult()).routes
}

/** Outage-aware accessor — see `CmsRoutesResult.degraded`. Used by markdown-document.ts. */
export async function getCmsRoutesResult(): Promise<CmsRoutesResult> {
  return fetchCmsRoutesResult()
}
