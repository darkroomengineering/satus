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
  listableRoutes,
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

  it('carries metadata.noIndex so listings can drop the page while it still resolves', () => {
    const doc = (slug: string, noIndex?: boolean | null) => ({
      _type: 'page',
      title: slug,
      slug: { current: slug },
      _updatedAt: '2026-01-01T00:00:00.000Z',
      ...(noIndex !== undefined && { noIndex }),
    })

    const routes = buildRoutesFromDocuments([
      doc('hidden', true),
      doc('shown', false),
      doc('unset', null),
      doc('absent'),
    ])

    expect(routes.map((route) => [route.path, route.noIndex] as const)).toEqual(
      [
        ['/hidden', true],
        ['/shown', false],
        ['/unset', false],
        ['/absent', false],
      ]
    )
    expect(listableRoutes(routes).map((route) => route.path)).toEqual([
      '/shown',
      '/unset',
      '/absent',
    ])
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

  // Each of these paths is served by something other than the CMS catch-all,
  // so a document slugged the same must not reach the sitemap or llms.txt.
  // `/ai` is dropped as a listed static route; the others are in
  // RESERVED_PATHS and are never advertised themselves. `/agent-content` is
  // the handler proxy.ts rewrites to, which 404s direct requests.
  it.each([
    ['ai', 'a listed static route', true],
    ['studio', 'Sanity Studio', false],
    ['agent-content', 'the Markdown negotiation handler', false],
    ['sanity', 'the wiring tutorial', false],
    ['webgl', 'the WebGL example', false],
  ])(
    'drops a document slugged `%s` — %s owns that path',
    (slug, _owner, listed) => {
      const routes = buildRoutesFromDocuments([
        {
          _type: 'page',
          title: slug,
          slug: { current: slug },
          _updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ])

      expect(STATIC_ROUTES.some((route) => route.path === `/${slug}`)).toBe(
        listed
      )
      expect(routes).toEqual([])
    }
  )

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

  // `urlForReference` owns slug validation (see link.test.ts); this is the
  // route-builder boundary: a slug it resolves to `#` produces no route. The
  // slug has no dot, so it gets past the schema and reaches that check.
  it('omits a CMS document whose slug cannot form a canonical internal route', () => {
    const docs = [
      {
        _type: 'page',
        title: 'Unsafe route',
        slug: { current: 'foo/bar' },
        _updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

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

  it('keeps a CMS document whose safe slug is not lowercase kebab-case, unchanged', () => {
    const routes = buildRoutesFromDocuments([
      {
        _type: 'page',
        title: 'Safe route',
        slug: { current: 'Uppercase' },
        _updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ])

    expect(routes.map((route) => route.path)).toEqual(['/Uppercase'])
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
    noIndex: false,
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
