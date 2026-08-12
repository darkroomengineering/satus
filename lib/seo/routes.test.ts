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
})
