import { getImageDimensions } from '@sanity/asset-utils'
// Not `next-sanity`: its root entry re-exports the whole client, and this
// component can be rendered from a client component.
import { stegaClean } from '@sanity/client/stega'

import { Image, type ImageProps } from '@/components/ui/image'
import type {
  SanityImageCrop,
  SanityImageHotspot,
} from '@/integrations/sanity/sanity.types'
import { urlForImage } from '@/integrations/sanity/utils/image'

// Sizing is fully owned by this component (it always derives aspectRatio
// from the Sanity asset and always sets `sizes` itself below), so
// fill/width/height and mobileSize/desktopSize/sizes are all omitted —
// Omit over ImageProps' discriminated unions collapses each union to a
// single flattened object type, so leaving any of these in would let a
// caller pass a combination that no longer matches any single ImageProps
// branch.
interface SanityImageProps extends Omit<
  ImageProps,
  | 'src'
  | 'aspectRatio'
  | 'fill'
  | 'width'
  | 'height'
  | 'alt'
  | 'mobileSize'
  | 'desktopSize'
  | 'sizes'
> {
  image: {
    asset?: {
      _ref: string
      _type: 'reference'
    }
    alt?: string
    hotspot?: SanityImageHotspot
    crop?: SanityImageCrop
  }
  maxWidth?: number
  /**
   * Alt text override. Falls back to the CMS-provided `image.alt`, then `''`
   * (decorative). Either way it is stega-cleaned, since draft mode adds hidden
   * edit markers to every Sanity string.
   */
  alt?: string
}

export function SanityImage({
  image,
  maxWidth = 1920,
  alt,
  ...props
}: SanityImageProps) {
  if (!image?.asset) return null

  const { width, height } = getImageDimensions(image.asset)
  const aspectRatio = width / height

  return (
    <Image
      src={urlForImage(image).width(maxWidth).auto('format').quality(80).url()}
      alt={stegaClean(alt ?? image.alt) ?? ''}
      aspectRatio={aspectRatio}
      sizes={`(max-width: ${maxWidth}px) 100vw, ${maxWidth}px`}
      {...props}
    />
  )
}
