import type { Metadata } from 'next'

/**
 * Metadata Generation Utilities
 *
 * Helpers to generate consistent metadata across pages,
 * reducing duplication and ensuring SEO best practices.
 */

interface GenerateMetadataOptions {
  title?: string
  description?: string
  keywords?: string[]
  image?: {
    url?: string
    width?: number
    height?: number
    alt?: string
  }
  url?: string
  siteName?: string
  noIndex?: boolean
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  authors?: string[]
}

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://localhost:3000'

/**
 * Generate complete metadata object for pages
 *
 * @example
 * ```ts
 * export async function generateMetadata({ params }) {
 *   const page = await fetchPage(params.slug)
 *
 *   return generatePageMetadata({
 *     title: page.metadata?.title || page.title,
 *     description: page.metadata?.description,
 *     image: { url: page.metadata?.image?.asset?.url },
 *     url: `/page/${params.slug}`,
 *     noIndex: page.metadata?.noIndex,
 *   })
 * }
 * ```
 */
export function generatePageMetadata(
  options: GenerateMetadataOptions
): Metadata {
  const {
    title,
    description,
    keywords,
    image,
    url,
    siteName = 'Satūs',
    noIndex = false,
    type = 'website',
    publishedTime,
    modifiedTime,
    authors,
  } = options

  const fullUrl = url ? `${APP_BASE_URL}${url}` : APP_BASE_URL
  const imageUrl = image?.url || '/opengraph-image.jpg'
  const imageWidth = image?.width || 1200
  const imageHeight = image?.height || 630
  const imageAlt = image?.alt || title || siteName

  const metadata: Metadata = {
    metadataBase: new URL(APP_BASE_URL),
    title,
    description,
    keywords,
    alternates: {
      canonical: url || '/',
    },
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName,
      locale: 'en_US',
      type,
      images: [
        {
          url: imageUrl,
          width: imageWidth,
          height: imageHeight,
          alt: imageAlt,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(authors && { authors }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: imageWidth,
          height: imageHeight,
          alt: imageAlt,
        },
      ],
    },
    other: {
      'fb:app_id': process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
    },
  }

  if (noIndex) {
    metadata.robots = {
      index: false,
      follow: false,
    }
  }

  return metadata
}

/**
 * Generate metadata specifically for Sanity CMS pages
 *
 * @example
 * ```ts
 * export async function generateMetadata({ params }) {
 *   const { data } = await sanityFetch({ query: pageQuery, params })
 *
 *   return generateSanityMetadata({
 *     document: data,
 *     url: `/sanity/${params.slug}`,
 *   })
 * }
 * ```
 */
export function generateSanityMetadata(options: {
  document: {
    title?: string
    metadata?: {
      title?: string
      description?: string
      keywords?: string[]
      image?: { asset?: { url?: string } }
      noIndex?: boolean
    }
    _updatedAt?: string
    publishedAt?: string
  }
  url?: string
  type?: 'website' | 'article'
}): Metadata {
  const { document, url, type = 'website' } = options
  const metadata = document.metadata

  if (!metadata) {
    // Fallback to basic metadata if none provided
    return generatePageMetadata({
      title: document.title,
      url,
      type,
    })
  }

  return generatePageMetadata({
    title: metadata.title || document.title,
    description: metadata.description,
    keywords: metadata.keywords,
    image: {
      url: metadata.image?.asset?.url,
    },
    url,
    noIndex: metadata.noIndex,
    type,
    publishedTime: document.publishedAt,
    modifiedTime: document._updatedAt,
  })
}
