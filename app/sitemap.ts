import type { MetadataRoute } from 'next'
import { isSanityConfigured } from '~/integrations/check-integration'

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseRoutes: MetadataRoute.Sitemap = [
    {
      url: APP_BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  // Only fetch Sanity pages if Sanity is configured
  if (isSanityConfigured()) {
    try {
      const { client } = await import('~/integrations/sanity')
      const { groq } = await import('next-sanity')

      // Fetch all published pages and articles
      const pages = await client.fetch<
        Array<{
          slug: { current: string }
          _updatedAt: string
          metadata?: { noIndex?: boolean }
        }>
      >(
        groq`*[_type == "page" && defined(slug.current)] {
          slug,
          _updatedAt,
          metadata
        }`
      )

      const articles = await client.fetch<
        Array<{
          slug: { current: string }
          _updatedAt: string
          metadata?: { noIndex?: boolean }
        }>
      >(
        groq`*[_type == "article" && defined(slug.current)] {
          slug,
          _updatedAt,
          metadata
        }`
      )

      // Add pages to sitemap (exclude noIndex pages)
      const pageEntries: MetadataRoute.Sitemap = pages
        .filter((page) => !page.metadata?.noIndex)
        .map((page) => ({
          url: `${APP_BASE_URL}/sanity/${page.slug.current}`,
          lastModified: new Date(page._updatedAt),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }))

      // Add articles to sitemap (exclude noIndex articles)
      const articleEntries: MetadataRoute.Sitemap = articles
        .filter((article) => !article.metadata?.noIndex)
        .map((article) => ({
          url: `${APP_BASE_URL}/sanity/${article.slug.current}`,
          lastModified: new Date(article._updatedAt),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }))

      return [...baseRoutes, ...pageEntries, ...articleEntries]
    } catch (error) {
      console.error('Error generating sitemap from Sanity:', error)
      return baseRoutes
    }
  }

  return baseRoutes
}
