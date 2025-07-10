import { getImageDimensions } from '@sanity/asset-utils'
import { Image, type ImageProps } from '~/components/image'
import { urlForImage } from '~/integrations/sanity'

interface SanityImageProps extends Omit<ImageProps, 'src' | 'aspectRatio'> {
  image: {
    asset: {
      _ref: string
      _type: 'reference'
    }
    alt?: string
    hotspot?: object
    crop?: object
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
      alt={alt || image.alt || ''}
      aspectRatio={aspectRatio}
      {...props}
    />
  )
}
