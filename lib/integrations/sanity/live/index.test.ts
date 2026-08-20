/**
 * Unit tests for `sanityFetch` mode resolution and the published-content
 * fallback (issue #379).
 *
 * `resolveSanityFetchMode` and `createPublishedFetch`/`createStubFetch` are
 * pure — extracted specifically so this file can cover all three
 * configurations without invoking `defineLive` (which requires a real
 * Next.js RSC/`'use cache'` context to run) or fighting module-load-time
 * env caching.
 */

import { describe, expect, test } from 'bun:test'

import {
  createPublishedFetch,
  createStubFetch,
  type FetchClient,
  resolveSanityFetchMode,
} from './index'

describe('resolveSanityFetchMode', () => {
  test('private token present -> live', () => {
    expect(
      resolveSanityFetchMode({
        configured: true,
        hasClient: true,
        privateToken: 'sk-editor-token',
      })
    ).toBe('live')
  })

  test('configured, client present, no private token -> published', () => {
    expect(
      resolveSanityFetchMode({
        configured: true,
        hasClient: true,
        privateToken: '',
      })
    ).toBe('published')
  })

  test('not configured -> stub, regardless of token', () => {
    expect(
      resolveSanityFetchMode({
        configured: false,
        hasClient: false,
        privateToken: '',
      })
    ).toBe('stub')

    expect(
      resolveSanityFetchMode({
        configured: false,
        hasClient: false,
        privateToken: 'sk-editor-token',
      })
    ).toBe('stub')
  })

  test('configured but no client -> stub', () => {
    expect(
      resolveSanityFetchMode({
        configured: true,
        hasClient: false,
        privateToken: 'sk-editor-token',
      })
    ).toBe('stub')
  })
})

describe('createPublishedFetch', () => {
  test('fetches published content through client.fetch and shapes the result like sanityFetch', async () => {
    const calls: { query: string; params: unknown }[] = []
    // Minimal double of `SanityClient` — only `.fetch` is exercised by
    // `createPublishedFetch`, so a full mock of the class isn't warranted.
    const mockClient: FetchClient = {
      fetch: async (query, params) => {
        calls.push({ query, params })
        return { _id: 'doc-1', title: 'Hello' }
      },
    }

    const fetchFn = createPublishedFetch(mockClient)
    const result = await fetchFn({
      query: '*[_type == "page" && slug.current == $slug][0]',
      params: { slug: 'about' },
      perspective: 'published',
      stega: false,
    })

    expect(result).toEqual({
      data: { _id: 'doc-1', title: 'Hello' },
      sourceMap: null,
      // Derived from query intent (issue: a null/empty result must still
      // carry the tags the publish webhook revalidates, or a cached miss
      // can never be invalidated) — not from the result, which has no
      // `_type`/`slug` fields of its own here.
      tags: ['page', 'page:about'],
    })
    expect(calls).toEqual([
      {
        query: '*[_type == "page" && slug.current == $slug][0]',
        params: { slug: 'about' },
      },
    ])
  })

  test('fetches without params when none are given', async () => {
    const calls: { query: string; params: unknown }[] = []
    const mockClient: FetchClient = {
      fetch: async (query, params) => {
        calls.push({ query, params })
        return []
      },
    }

    const fetchFn = createPublishedFetch(mockClient)
    const result = await fetchFn({
      query: '*[_type in ["page", "article"]]',
      perspective: 'published',
      stega: false,
    })

    expect(result.data).toEqual([])
    expect(calls).toEqual([
      { query: '*[_type in ["page", "article"]]', params: undefined },
    ])
  })

  test('passes through custom tags, defaulting to an empty array', async () => {
    const mockClient: FetchClient = {
      fetch: async () => null,
    }

    const fetchFn = createPublishedFetch(mockClient)

    const withTags = await fetchFn({
      query: '*[_type == "page"][0]',
      perspective: 'published',
      stega: false,
      tags: ['custom-tag'],
    })
    // Custom tags are additive to the intent-derived 'page' tag, not a
    // replacement for it.
    expect(withTags.tags).toEqual(['custom-tag', 'page'])

    const withoutTags = await fetchFn({
      query: '*[_type == "page"][0]',
      perspective: 'published',
      stega: false,
    })
    expect(withoutTags.tags).toEqual(['page'])
  })

  test('derives tags from query intent even when the result is null/empty', async () => {
    // Covers the bug this function fixes: a query for a document that
    // doesn't exist yet (or matches nothing) must still carry the tags the
    // publish webhook revalidates (app/api/revalidate/route.ts fires
    // revalidateTag('page') / revalidateTag('page:home') on publish,
    // regardless of what was previously cached), or a cached miss can never
    // be invalidated and the page 404s until time-based expiry.
    const mockClient: FetchClient = { fetch: async () => null }
    const fetchFn = createPublishedFetch(mockClient)

    const noSlug = await fetchFn({
      query: '*[_type == "page" && slug.current == $slug][0]',
      perspective: 'published',
      stega: false,
    })
    expect(noSlug.tags).toEqual(['page'])

    const withSlug = await fetchFn({
      query: '*[_type == "page" && slug.current == $slug][0]',
      params: { slug: 'not-yet-published' },
      perspective: 'published',
      stega: false,
    })
    expect(withSlug.tags).toEqual(['page', 'page:not-yet-published'])

    const noTypeFilter = await fetchFn({
      query: '*[_type in ["page", "article"]]',
      perspective: 'published',
      stega: false,
    })
    expect(noTypeFilter.tags).toEqual([])
  })
})

describe('createStubFetch', () => {
  test('returns null data with an empty tags array', async () => {
    const fetchFn = createStubFetch()
    const result = await fetchFn({
      query: '*[_type == "page"][0]',
      perspective: 'published',
      stega: false,
    })

    expect(result).toEqual({ data: null, sourceMap: null, tags: [] })
  })
})
