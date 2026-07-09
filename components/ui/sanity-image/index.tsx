import { getImageDimensions } from '@sanity/asset-utils'
import { Image, type ImageProps } from '@/components/ui/image'
import type {
  SanityImageCrop,
  SanityImageHotspot,
} from '@/integrations/sanity/sanity.types'
import { urlForImage } from '@/integrations/sanity/utils/image'

// Sizing is fully owned by this component (it always derives aspectRatio
// from the Sanity asset), so fill/width/height are omitted alongside
// src/aspectRatio — Omit over ImageProps' discriminated sizing union
// collapses to the union of each branch's key types, so leaving
// fill/width/height in would let a caller pass a combination that no longer
// matches any single ImageProps branch.
interface SanityImageProps
  extends Omit<
    ImageProps,
    'src' | 'aspectRatio' | 'fill' | 'width' | 'height'
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
      alt={alt ?? image.alt ?? ''}
      aspectRatio={aspectRatio}
      sizes={`(max-width: ${maxWidth}px) 100vw, ${maxWidth}px`}
      {...props}
    />
  )
}
