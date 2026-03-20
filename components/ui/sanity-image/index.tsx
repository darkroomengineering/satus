import { getImageDimensions } from '@sanity/asset-utils'
import { Image, type ImageProps } from '@/components/ui/image'
import type {
  SanityImageCrop,
  SanityImageHotspot,
} from '@/integrations/sanity/sanity.types'
import { urlForImage } from '@/integrations/sanity/utils/image'

interface SanityImageProps extends Omit<ImageProps, 'src' | 'aspectRatio'> {
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
      src={urlForImage(image).width(maxWidth).url()}
      alt={alt ?? image.alt ?? ''}
      aspectRatio={aspectRatio}
      sizes={`(max-width: ${maxWidth}px) 100vw, ${maxWidth}px`}
      {...props}
    />
  )
}
