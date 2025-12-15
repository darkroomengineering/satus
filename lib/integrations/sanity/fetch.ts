import type { QueryParams } from 'next-sanity'
import { cacheSignal } from 'react'
import { client } from './client'

/**
 * Fetch helper for Sanity queries with automatic cache signal integration.
 * The cacheSignal automatically aborts the request when:
 * - React has successfully completed rendering
 * - The render was aborted
 * - The render has failed
 *
 * @see https://react.dev/reference/react/cacheSignal
 */
export async function fetchSanity<T>(
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
): Promise<T> {
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
 * Fetch a page by slug with cacheSignal integration
 */
export async function fetchPage(slug: string) {
  const { pageQuery } = await import('./queries')

  return fetchSanity(
    pageQuery,
    { slug },
    {
      next: {
        revalidate: 3600, // 1 hour
        tags: ['page', `page:${slug}`],
      },
    }
  )
}

/**
 * Fetch a page by ID with cacheSignal integration
 */
export async function fetchPageById(id: string) {
  const { pageByIdQuery } = await import('./queries')

  return fetchSanity(
    pageByIdQuery,
    { id },
    {
      next: {
        revalidate: 3600,
        tags: ['page', `page:${id}`],
      },
    }
  )
}

/**
 * Fetch an article by slug with cacheSignal integration
 */
export async function fetchArticle(slug: string) {
  const { articleQuery } = await import('./queries')

  return fetchSanity(
    articleQuery,
    { slug },
    {
      next: {
        revalidate: 3600,
        tags: ['article', `article:${slug}`],
      },
    }
  )
}

/**
 * Fetch an article by ID with cacheSignal integration
 */
export async function fetchArticleById(id: string) {
  const { articleByIdQuery } = await import('./queries')

  return fetchSanity(
    articleByIdQuery,
    { id },
    {
      next: {
        revalidate: 3600,
        tags: ['article', `article:${id}`],
      },
    }
  )
}

/**
 * Fetch all articles with cacheSignal integration
 */
export async function fetchAllArticles() {
  const { allArticlesQuery } = await import('./queries')

  return fetchSanity(
    allArticlesQuery,
    {},
    {
      next: {
        revalidate: 3600,
        tags: ['articles'],
      },
    }
  )
}
