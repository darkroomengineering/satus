// No Shopify imports: this file stays when `setup:project` strips Shopify.
const SHOPIFY_CDN = 'https://cdn.shopify.com/'

/** What next/image passes a loader (its `ImageLoaderProps`). */
interface LoaderProps {
  src: string
  width: number
}

/** An image on Shopify's CDN, which resizes it itself. */
export const isShopifyImage = (src: string) => src.startsWith(SHOPIFY_CDN)

/**
 * next/image's `srcset` widths, resized by Shopify's CDN (`width`, the
 * parameter Hydrogen's `shopifyLoader` sets) instead of Next's optimizer.
 * Shopify's CDN picks the output format itself, so these images skip the
 * WebP-only `images.formats` setting, and it takes no quality parameter.
 */
export function shopifyLoader({ src, width }: LoaderProps) {
  const url = new URL(src)
  url.searchParams.set('width', String(width))
  return url.href
}
