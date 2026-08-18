import type { MetadataRoute } from 'next'
import { defineQuery } from 'next-sanity'
import { z } from 'zod'

import { isConfigured } from '@/integrations/registry'
import { sanityFetch } from '@/integrations/sanity/live'
import { urlForReference } from '@/integrations/sanity/utils/link'

/**
 * Route enumeration shared by `app/sitemap.ts` and `app/llms.txt/route.ts` —
 * the sitemap and the machine-readable content list must never disagree
 * about which URLs exist, so both read from here instead of keeping their
 * own copies.
 */

export interface StaticRoute {
  path: string
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
  priority: number
}

export interface ContentRoute {
  path: string
  label: string
  lastModified: Date
}

/**
 * Routes with no CMS backing. `/ai` has no link from the design, so
 * `app/sitemap.ts` is the only place crawlers discover it — see
 * `app/(site)/ai/page.tsx`, which links the same route from its own
 * hardcoded `PAGES` list for the human/agent-facing machine view.
 *
 * The `(examples)` route group (`/sanity`) is a Sanity wiring tutorial for
 * developers, not real site content — deliberately excluded here so
 * search/AI indexes don't cite a demo page as part of the site.
 */
export const STATIC_ROUTES: readonly StaticRoute[] = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/ai', changeFrequency: 'monthly', priority: 0.5 },
]

const staticPaths = new Set(STATIC_ROUTES.map((route) => route.path))

/**
 * Every document type with a `slug` — kept permissive (`nullable()` fields)
 * because this validates a hand-written query rather than a typegen'd one;
 * malformed documents are skipped per-entry in `getCmsRoutes` rather than
 * failing the whole fetch.
 */
const routableDocumentSchema = z.object({
  _type: z.enum(['page', 'article']),
  title: z.string().nullable(),
  slug: z.object({ current: z.string() }).nullable(),
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
    if (path === '#' || staticPaths.has(path)) continue

    routes.set(path, {
      path,
      label: doc.title ?? doc.slug.current,
      lastModified,
    })
  }

  return [...routes.values()]
}

/**
 * Every published `page`/`article` document, resolved to the same URL
 * `urlForReference` (`@/integrations/sanity/utils/link`) uses for internal
 * links elsewhere in the app — so the sitemap and `/llms.txt` can never
 * disagree with on-page navigation about where a document lives.
 *
 * Returns `[]` when Sanity isn't configured (a fresh clone's default
 * state): no fetch runs, and callers degrade to `STATIC_ROUTES` only.
 *
 * `'use cache'` is required: `sanityFetch` calls `cacheTag()` internally,
 * which Cache Components (`cacheComponents: true`) only allows inside a
 * `'use cache'` boundary — see `app/(site)/(examples)/sanity/page.tsx` for
 * the same constraint applied to a page-level fetch. `perspective`/`stega`
 * are hardcoded to the published, non-stega variant: crawlers never see
 * draft content, so there's no request-level (draft mode) state to branch
 * on here, unlike a rendered page.
 */
export async function getCmsRoutes(): Promise<ContentRoute[]> {
  'use cache'

  if (!isConfigured('sanity')) return []

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
    return []
  }

  return buildRoutesFromDocuments(data)
}
