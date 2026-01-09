import type { QueryParams } from 'next-sanity'
import { cache, cacheSignal } from 'react'
import { isSanityConfigured } from '~/integrations/check-integration'
import { client } from './client'

/**
 * Internal fetch helper for Sanity queries with automatic cache signal integration.
 * The cacheSignal automatically aborts the request when:
 * - React has successfully completed rendering
 * - The render was aborted
 * - The render has failed
 *
 * Returns null if Sanity is not configured.
 *
 * @see https://react.dev/reference/react/cacheSignal
 */
async function fetchSanityInternal<T>(
  query: string,
  params: QueryParams = {},
  options: {
    cache?: RequestCache
    next?: {
      revalidate?: number | false
      tags?: string[]
    }
    perspective?: 'published' | 'previewDrafts' | 'raw'
    useCdn?: boolean
    stega?: boolean
  } = {}
): Promise<T | null> {
  // Return null if Sanity is not configured
  if (!(isSanityConfigured() && client)) {
    return null
  }

  const signal = cacheSignal()

  return client.fetch<T>(query, params, {
    // Only pass signal if cacheSignal returns a non-null value
    // Cast to AbortSignal for type compatibility
    ...(signal && { signal: signal as AbortSignal }),
    cache: options.cache,
    next: options.next,
    ...(options.perspective && { perspective: options.perspective }),
    ...(options.useCdn !== undefined && { useCdn: options.useCdn }),
    ...(options.stega !== undefined && { stega: options.stega }),
  })
}

/**
 * Public fetch helper wrapped with React cache() for request deduplication.
 * Multiple calls with the same query + params in the same render will only
 * make one actual request.
 *
 * @see https://react.dev/reference/react/cache
 */
export const fetchSanity = cache(fetchSanityInternal)

/**
 * Fetch a page by slug with request deduplication.
 * Uses React cache() to ensure generateMetadata() and page() share the same request.
 */
export const fetchPage = cache(async (slug: string) => {
  const { pageQuery } = await import('./queries')

  return fetchSanityInternal(
    pageQuery,
    { slug },
    {
      next: {
        revalidate: 3600, // 1 hour
        tags: ['page', `page:${slug}`],
      },
    }
  )
})

/**
 * Fetch a page by ID with request deduplication.
 */
export const fetchPageById = cache(async (id: string) => {
  const { pageByIdQuery } = await import('./queries')

  return fetchSanityInternal(
    pageByIdQuery,
    { id },
    {
      next: {
        revalidate: 3600,
        tags: ['page', `page:${id}`],
      },
    }
  )
})

/**
 * Fetch an article by slug with request deduplication.
 */
export const fetchArticle = cache(async (slug: string) => {
  const { articleQuery } = await import('./queries')

  return fetchSanityInternal(
    articleQuery,
    { slug },
    {
      next: {
        revalidate: 3600,
        tags: ['article', `article:${slug}`],
      },
    }
  )
})

/**
 * Fetch an article by ID with request deduplication.
 */
export const fetchArticleById = cache(async (id: string) => {
  const { articleByIdQuery } = await import('./queries')

  return fetchSanityInternal(
    articleByIdQuery,
    { id },
    {
      next: {
        revalidate: 3600,
        tags: ['article', `article:${id}`],
      },
    }
  )
})

/**
 * Fetch all articles with request deduplication.
 */
export const fetchAllArticles = cache(async () => {
  const { allArticlesQuery } = await import('./queries')
  type ArticleSummary = {
    _id: string
    slug?: { current?: string } | null
  }

  return fetchSanityInternal<ArticleSummary[]>(
    allArticlesQuery,
    {},
    {
      next: {
        revalidate: 3600,
        tags: ['articles'],
      },
    }
  )
})
