// No Sanity imports: this file stays when `setup:project` strips Sanity.
const SANITY_IMAGES = 'https://cdn.sanity.io/images/'
const SANITY_FILES = 'https://cdn.sanity.io/files/'

/** What next/image passes a loader (its `ImageLoaderProps`). */
interface LoaderProps {
  src: string
  width: number
  quality?: number
}

/** An image on Sanity's CDN, which resizes it itself. */
export const isSanityImage = (src: string) => src.startsWith(SANITY_IMAGES)

/**
 * A file asset on Sanity's CDN (an image uploaded to a `file` field). The CDN
 * serves files as uploaded, without resizing, and Next's optimizer can't
 * fetch them either (`cdn.sanity.io` is not in `images.remotePatterns`), so
 * `Image` renders them unoptimized. Cost: every viewport downloads the
 * original file.
 */
export const isSanityFile = (src: string) => src.startsWith(SANITY_FILES)

/**
 * next/image's `srcset` widths, resized by Sanity's CDN instead of Next's
 * optimizer, always as WebP (`fm=webp`; `auto=format` would send AVIF to
 * browsers that accept it, which decodes slower). `fit=max` never upscales.
 * Keeps any `rect` the URL already carries, so the editor's crop survives.
 */
export function sanityLoader({ src, width, quality }: LoaderProps) {
  const url = new URL(src)
  url.searchParams.set('w', String(width))
  if (quality) url.searchParams.set('q', String(quality))
  url.searchParams.set('fm', 'webp')
  url.searchParams.set('fit', 'max')
  return url.href
}
