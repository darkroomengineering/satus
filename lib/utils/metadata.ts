import type { Metadata } from 'next'

import { env } from '@/lib/env'
import { routeAlternates } from '@/lib/seo/alternates'
import { BASE_URL, SITE } from '@/lib/seo/site'

/** Roughly where Google truncates a description in a result snippet. */
const DESCRIPTION_MAX_LENGTH = 155

/**
 * Trims prose to snippet length on a word boundary, for deriving a description
 * from body copy. A page inheriting the site-wide description is, to an answer
 * engine, indistinguishable from every other page.
 *
 * Returns `''` for empty input so callers can use `||` to fall through.
 */
export function truncateDescription(
  text: string | null | undefined,
  maxLength: number = DESCRIPTION_MAX_LENGTH
): string {
  const collapsed = text?.replace(/\s+/g, ' ').trim()
  if (!collapsed) return ''
  if (collapsed.length <= maxLength) return collapsed

  const clipped = collapsed.slice(0, maxLength)
  const lastSpace = clipped.lastIndexOf(' ')

  // A single word longer than the limit has no space to cut at; hard-clip it.
  return `${(lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`
}

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

export function generatePageMetadata(
  options: GenerateMetadataOptions
): Metadata {
  const {
    title,
    description,
    keywords,
    image,
    url,
    siteName = SITE.name,
    noIndex = false,
    type = 'website',
    publishedTime,
    modifiedTime,
    authors,
  } = options

  const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL
  const imageUrl = image?.url ?? '/opengraph-image.jpg'
  const imageWidth = image?.width ?? 1200
  const imageHeight = image?.height ?? 630
  const imageAlt = image?.alt ?? title ?? siteName

  const metadata: Metadata = {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    keywords,
    alternates: routeAlternates(url ?? '/'),
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
  }

  if (env.NEXT_PUBLIC_FACEBOOK_APP_ID) {
    metadata.other = { 'fb:app_id': env.NEXT_PUBLIC_FACEBOOK_APP_ID }
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
 * Pass a stega-cleaned document (`stegaClean(data)` from `next-sanity`). In
 * draft mode every Sanity string carries Presentation's hidden edit markers,
 * and this helper copies them into `<title>`, the description and the Open
 * Graph tags as is. It doesn't clean them itself because `setup:project`
 * keeps this file when it strips Sanity and removes `next-sanity` with it.
 * Cost: each caller has to remember the call; the three in `app/(site)` do.
 */
export function generateSanityMetadata(options: {
  // Nullable to accept TypeGen query-result types directly.
  document: {
    title?: string | null
    metadata?: {
      title?: string | null
      description?: string | null
      keywords?: string[] | null
      noIndex?: boolean | null
    } | null
    _updatedAt?: string | null
    publishedAt?: string | null
    /** Body prose used to derive a description when the editor left one blank. */
    excerpt?: string | null
  }
  url?: string
  type?: 'website' | 'article'
}): Metadata {
  const { document, url, type = 'website' } = options
  const metadata = document.metadata

  // Editors leave the SEO description empty far more often than the body, and
  // a page with no description of its own inherits the site-wide one, making
  // every such page look identical to a crawler.
  const derivedDescription = truncateDescription(document.excerpt)

  if (!metadata) {
    const fallbackOptions: GenerateMetadataOptions = { type }
    if (document.title) fallbackOptions.title = document.title
    if (derivedDescription) fallbackOptions.description = derivedDescription
    if (url) fallbackOptions.url = url
    return generatePageMetadata(fallbackOptions)
  }

  // Locals let control-flow narrowing strip `null` before generatePageMetadata.
  // The OG image is not derived from `metadata.image`: the queries don't
  // dereference the asset (`asset->{url}`), so the default image is used.
  const title = metadata.title ?? document.title
  const { description, keywords, noIndex } = metadata
  const { publishedAt, _updatedAt } = document

  const resolvedDescription = description || derivedDescription

  const pageOptions: GenerateMetadataOptions = { type }
  if (title) pageOptions.title = title
  if (resolvedDescription) pageOptions.description = resolvedDescription
  if (keywords) pageOptions.keywords = keywords
  if (url) pageOptions.url = url
  if (noIndex != null) pageOptions.noIndex = noIndex
  if (publishedAt) pageOptions.publishedTime = publishedAt
  if (_updatedAt) pageOptions.modifiedTime = _updatedAt

  return generatePageMetadata(pageOptions)
}
