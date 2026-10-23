/**
 * `buildRoutesFromDocuments` validates each CMS document independently: one
 * malformed document must not drop every CMS route from `sitemap.xml` and
 * `/llms.txt`.
 */

import { describe, expect, it, spyOn } from 'bun:test'

import {
  buildRoutesFromDocuments,
  type CmsRoutesResult,
  getCmsRoutes,
  getCmsRoutesResult,
  STATIC_ROUTES,
} from './routes'

describe('buildRoutesFromDocuments', () => {
  it('skips a single malformed document without dropping the valid ones', () => {
    const docs = [
      {
        _type: 'page',
        title: 'About',
        slug: { current: 'about' },
        _updatedAt: '2026-01-01T00:00:00.000Z',
      },
      // Malformed: `_type` is not in the enum.
      {
        _type: 'not-a-real-type',
        title: 'Broken',
        slug: { current: 'broken' },
        _updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        _type: 'article',
        title: 'Hello World',
        slug: { current: 'hello-world' },
        _updatedAt: '2026-02-01T00:00:00.000Z',
      },
    ]

    const routes = buildRoutesFromDocuments(docs)

    expect(routes).toHaveLength(2)
    expect(routes.map((route) => route.path).sort()).toEqual(
      ['/about', '/articles/hello-world'].sort()
    )
  })

  it('returns an empty array when every document is malformed', () => {
    const docs = [
      { _type: 'not-a-real-type', slug: { current: 'a' } },
      { _type: 'also-not-real', slug: { current: 'b' } },
    ]

    expect(buildRoutesFromDocuments(docs)).toEqual([])
  })

  it('returns an empty array for non-array input instead of throwing', () => {
    expect(buildRoutesFromDocuments(null)).toEqual([])
    expect(buildRoutesFromDocuments(undefined)).toEqual([])
    expect(buildRoutesFromDocuments('not an array')).toEqual([])
  })

  it('drops a document whose slug resolves to an already-listed static route', () => {
    // `/ai` is a static route, so a page named `ai` collides with it.
    const docs = [
      {
        _type: 'page',
        title: 'AI',
        slug: { current: 'ai' },
        _updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    const routes = buildRoutesFromDocuments(docs)
    expect(STATIC_ROUTES.some((route) => route.path === '/ai')).toBe(true)
    expect(routes.some((route) => route.path === '/ai')).toBe(false)
  })

  it('drops a document slugged `studio` — Sanity Studio owns that path', () => {
    // `/studio` (app/studio/[[...tool]]/page.tsx) lives outside the
    // catch-all and isn't in STATIC_ROUTES, but a CMS doc slugged `studio`
    // must still be excluded, not emitted into the sitemap/llms.txt.
    const docs = [
      {
        _type: 'page',
        title: 'Studio',
        slug: { current: 'studio' },
        _updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    const routes = buildRoutesFromDocuments(docs)
    expect(STATIC_ROUTES.some((route) => route.path === '/studio')).toBe(false)
    expect(routes.some((route) => route.path === '/studio')).toBe(false)
  })

  it('drops a document slugged `agent-content` — the Markdown negotiation handler owns that path', () => {
    // Without RESERVED_PATHS excluding it, a CMS page slugged `agent-content`
    // would be advertised in the sitemap/`/ai` while proxy.ts's
    // MACHINE_PATHS still 404s direct requests to it.
    const docs = [
      {
        _type: 'page',
        title: 'Agent Content',
        slug: { current: 'agent-content' },
        _updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    const routes = buildRoutesFromDocuments(docs)
    expect(routes.some((route) => route.path === '/agent-content')).toBe(false)
  })

  it('drops a document slugged `sanity` — the wiring tutorial owns that path', () => {
    const docs = [
      {
        _type: 'page',
        title: 'Sanity',
        slug: { current: 'sanity' },
        _updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    const routes = buildRoutesFromDocuments(docs)
    expect(routes.some((route) => route.path === '/sanity')).toBe(false)
  })

  it('drops a document slugged `webgl` — the WebGL example owns that path', () => {
    const docs = [
      {
        _type: 'page',
        title: 'WebGL',
        slug: { current: 'webgl' },
        _updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    const routes = buildRoutesFromDocuments(docs)
    expect(routes.some((route) => route.path === '/webgl')).toBe(false)
  })

  it('lists a `home` page at /home — `/` stays developer-owned', () => {
    const docs = [
      {
        _type: 'page',
        title: 'Home',
        slug: { current: 'home' },
        _updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    const routes = buildRoutesFromDocuments(docs)
    expect(routes.map((route) => route.path)).toEqual(['/home'])
  })

  it('omits CMS documents whose slugs cannot form canonical internal routes', () => {
    const invalidSlugs = [
      '//evil.example',
      '\\evil.example',
      '../ai',
      'foo/bar',
      'foo?bar',
      'foo#bar',
      '.',
      '..',
      '%2f%2fevil.example',
      'invalid%encoding',
      'a'.repeat(97),
    ]
    const docs = invalidSlugs.map((slug, index) => ({
      _type: 'page',
      title: `Unsafe route ${index}`,
      slug: { current: slug },
      _updatedAt: '2026-01-01T00:00:00.000Z',
    }))

    expect(buildRoutesFromDocuments(docs)).toEqual([])
  })

  it('rejects a CMS slug containing a dot — it would collide with the file-extension heuristic proxy.ts uses to skip Markdown negotiation', () => {
    const docs = [
      {
        _type: 'page',
        title: 'Item v2',
        slug: { current: 'item.v2' },
        _updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    expect(buildRoutesFromDocuments(docs)).toEqual([])
  })

  it('keeps CMS documents whose safe slugs use the project naming policy', () => {
    const safeSlugs = [
      'lowercase-kebab-slug',
      'release_notes',
      'café',
      'Uppercase',
    ]
    const routes = buildRoutesFromDocuments(
      safeSlugs.map((slug) => ({
        _type: 'page',
        title: `Safe route: ${slug}`,
        slug: { current: slug },
        _updatedAt: '2026-01-01T00:00:00.000Z',
      }))
    )

    expect(routes.map((route) => route.path)).toEqual(
      safeSlugs.map((slug) => `/${slug}`)
    )
  })
})

/**
 * The two accessors split on purpose: the static surfaces (sitemap.xml,
 * llms.txt, `/ai`) must throw so Next keeps the last good copy, and the
 * per-request Markdown handler must not throw so it can answer 503. Ways
 * that split could break:
 *
 * 1. `getCmsRoutes` swallows a failed fetch and returns `[]`, so a static
 *    surface stores a copy without CMS routes for up to 30 days.
 * 2. `getCmsRoutesResult` lets the failure escape, so the Markdown handler
 *    500s instead of answering 503.
 * 3. `getCmsRoutesResult` reports a failure as `degraded: false`, so the
 *    Markdown handler 404s routes that exist once the outage clears.
 * 4. Either accessor alters or drops the routes of a successful fetch.
 * 5. A successful fetch is reported as degraded.
 *
 * The loader is injected (`load`), not mocked: a rejecting loader stands in
 * for a configured Sanity whose fetch fails.
 */
describe('getCmsRoutes / getCmsRoutesResult outage split', () => {
  const outage = () => Promise.reject(new Error('sanity unreachable'))
  const route = {
    path: '/about',
    label: 'About',
    lastModified: new Date('2026-01-01T00:00:00.000Z'),
  }
  const healthy = (): Promise<CmsRoutesResult> =>
    Promise.resolve({ routes: [route], degraded: false })

  it('getCmsRoutes throws when the fetch fails (1)', async () => {
    await expect(getCmsRoutes(outage)).rejects.toThrow('sanity unreachable')
  })

  it('getCmsRoutesResult returns degraded instead of throwing (2, 3)', async () => {
    const errorLog = spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      expect(await getCmsRoutesResult(outage)).toEqual({
        routes: [],
        degraded: true,
      })
      expect(errorLog).toHaveBeenCalledTimes(1)
    } finally {
      errorLog.mockRestore()
    }
  })

  it('both pass a successful fetch through untouched (4, 5)', async () => {
    expect(await getCmsRoutes(healthy)).toEqual([route])
    expect(await getCmsRoutesResult(healthy)).toEqual({
      routes: [route],
      degraded: false,
    })
  })
})
