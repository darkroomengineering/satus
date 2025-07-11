import { groq } from 'next-sanity'
import { client } from './client'

// Page queries
export const pageQuery = groq`
  *[_type == "page" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    content,
    metadata,
    publishedAt,
    _updatedAt
  }
`

export const pageByIdQuery = groq`
  *[_type == "page" && _id == $id][0] {
    _id,
    title,
    slug,
    content,
    metadata,
    publishedAt,
    _updatedAt
  }
`

// Article queries
export const articleQuery = groq`
  *[_type == "article" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    excerpt,
    featuredImage,
    content,
    categories,
    tags,
    author,
    publishedAt,
    metadata,
    _updatedAt
  }
`

export const allArticlesQuery = groq`
  *[_type == "article"] | order(publishedAt desc) {
    _id,
    title,
    slug,
    excerpt,
    featuredImage,
    categories,
    tags,
    author,
    publishedAt,
    metadata,
    _updatedAt
  }
`

export const articleByIdQuery = groq`
  *[_type == "article" && _id == $id][0] {
    _id,
    title,
    slug,
    excerpt,
    featuredImage,
    content,
    categories,
    tags,
    author,
    publishedAt,
    metadata,
    _updatedAt
  }
`

export async function fetchSanityPage(slug: string, isDraftMode = false) {
  try {
    const page = await client.fetch(
      pageQuery,
      { slug },
      isDraftMode
        ? {
            perspective: 'previewDrafts',
            stega: true,
            cache: 'no-store',
          }
        : {
            next: { revalidate: 3600, tags: ['page', `page:${slug}`] },
          }
    )
    return { data: page, error: null }
  } catch (error) {
    console.error('fetchSanityPage error:', error)
    return { data: null, error }
  }
}

export async function fetchSanityArticle(slug: string, isDraftMode = false) {
  try {
    const article = await client.fetch(
      articleQuery,
      { slug },
      isDraftMode
        ? {
            perspective: 'previewDrafts',
            stega: true,
            cache: 'no-store',
          }
        : {
            next: { revalidate: 3600, tags: ['article', `article:${slug}`] },
          }
    )
    return { data: article, error: null }
  } catch (error) {
    console.error('fetchSanityArticle error:', error)
    return { data: null, error }
  }
}

export async function fetchAllSanityArticles() {
  try {
    const articles = await client.fetch(
      allArticlesQuery,
      {},
      {
        next: { revalidate: 3600, tags: ['article'] },
      }
    )
    return { data: articles, error: null }
  } catch (error) {
    console.error('fetchAllSanityArticles error:', error)
    return { data: [], error }
  }
}

export async function fetchSanityPageById(id: string) {
  try {
    const page = await client.fetch(pageByIdQuery, { id })
    return { data: page, error: null }
  } catch (error) {
    console.error('fetchSanityPageById error:', error)
    return { data: null, error }
  }
}

export async function fetchSanityArticleById(id: string) {
  try {
    const article = await client.fetch(articleByIdQuery, { id })
    return { data: article, error: null }
  } catch (error) {
    console.error('fetchSanityArticleById error:', error)
    return { data: null, error }
  }
}
