/**
 * Regression test for issue #398 item L11: `z.array(routableDocumentSchema)
 * .safeParse(data)` returned `[]` on ANY validation failure, so one
 * malformed CMS document dropped every CMS route from `sitemap.xml` and
 * `/llms.txt` — contradicting the function's own docstring, which says
 * malformed documents are "skipped per-entry". `buildRoutesFromDocuments`
 * now validates each document independently and only skips the bad ones.
 *
 * Run with: bun test lib/seo/routes.test.ts
 */

import { describe, expect, it } from 'bun:test'

import { buildRoutesFromDocuments, STATIC_ROUTES } from './routes'

describe('buildRoutesFromDocuments', () => {
  it('skips a single malformed document without dropping the valid ones', () => {
    const docs = [
      {
        _type: 'page',
        title: 'About',
        slug: { current: 'about' },
        _updatedAt: '2026-01-01T00:00:00.000Z',
      },
      // Malformed: `_type` is not in the enum at all — this is the entry
      // that used to fail the whole batch.
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

  it('returns every route when all documents are valid', () => {
    const docs = [
      {
        _type: 'page',
        title: 'About',
        slug: { current: 'about' },
        _updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        _type: 'article',
        title: 'Hello World',
        slug: { current: 'hello-world' },
        _updatedAt: '2026-02-01T00:00:00.000Z',
      },
    ]

    expect(buildRoutesFromDocuments(docs)).toHaveLength(2)
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
