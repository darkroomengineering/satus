import { getImageDimensions } from '@sanity/asset-utils'
import { stegaClean } from 'next-sanity'

import { Image, type ImageProps } from '@/components/ui/image'
import type {
  SanityImageCrop,
  SanityImageHotspot,
} from '@/integrations/sanity/sanity.types'
import { urlForImage } from '@/integrations/sanity/utils/image'
import { clamp } from '@/utils/math'

// WebP quality. Measured on eight photos at 1080px, SSIM against the
// original: q80 averaged 56.4 KB at 0.9947, q90 90.0 KB at 0.9965. Cost:
// q80 gives up that much fidelity for the smaller file; raise it if a
// project sees artifacts (and add the value to `images.qualities`).
const QUALITY = 80

// Sizing is fully owned by this component (it always derives aspectRatio
// from the editor's crop and always sets `sizes` itself below), so
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
  /** The widest the image renders, in CSS pixels. Sets `sizes`. */
  maxWidth?: number
  /**
   * Alt text override. Falls back to the CMS-provided `image.alt`, then `''`
   * (decorative). Either way it is stega-cleaned, since draft mode adds hidden
   * edit markers to every Sanity string.
   */
  alt?: string
}

/** The crop's share of the image along one axis. */
const kept = (start = 0, end = 0) => 1 - start - end

/**
 * The hotspot as an `object-position`, so `object-cover` keeps the point the
 * editor picked in view. Sanity measures it on the uncropped image.
 */
function hotspotPosition(hotspot: SanityImageHotspot, crop?: SanityImageCrop) {
  const { x, y } = hotspot
  const left = ((x ?? 0.5) - (crop?.left ?? 0)) / kept(crop?.left, crop?.right)
  const top = ((y ?? 0.5) - (crop?.top ?? 0)) / kept(crop?.top, crop?.bottom)
  return `${clamp(0, left, 1) * 100}% ${clamp(0, top, 1) * 100}%`
}

export function SanityImage({
  image,
  maxWidth = 1920,
  alt,
  style,
  ...props
}: SanityImageProps) {
  if (!image?.asset) return null

  const { width, height } = getImageDimensions(image.asset)
  const { crop, hotspot } = image
  const aspectRatio =
    (width * kept(crop?.left, crop?.right)) /
    (height * kept(crop?.top, crop?.bottom))

  // The crop only: `Image`'s Sanity loader adds the width per `srcset`
  // candidate. A fixed width here would cap every candidate at it.
  const src = urlForImage(image).url()

  return (
    <Image
      src={src}
      alt={stegaClean(alt ?? image.alt) ?? ''}
      aspectRatio={aspectRatio}
      sizes={`(max-width: ${maxWidth}px) 100vw, ${maxWidth}px`}
      quality={QUALITY}
      style={{
        // A variable, not `objectPosition`: `Image` reads it at zero
        // specificity, so a caller's `object-*` class still wins.
        ...(hotspot && {
          '--object-position': hotspotPosition(hotspot, crop),
        }),
        ...style,
      }}
      {...props}
    />
  )
}
