'use client'

/** Next.js Image wrapper; use it instead of next/image. A Client Component for the `onDragStart` handler. */

import cn from 'clsx'
// oxlint-disable-next-line eslint/no-restricted-imports -- this is the wrapper the rule points everyone else at
import NextImage, { type ImageProps as NextImageProps } from 'next/image'
import type { CSSProperties, Ref } from 'react'

import { breakpoints } from '@/styles/config'

import { isSanityFile, isSanityImage, sanityLoader } from './sanity-loader'

import s from './image.module.css'

/**
 * Sizing variants. Every render must supply enough information to reserve
 * the correct layout box up front — there is no implicit fallback. Pick one:
 * - `fill`: fills the nearest positioned ancestor (that ancestor owns sizing)
 * - explicit `width` + `height`: intrinsic pixel dimensions
 * - `aspectRatio` alone: placeholder dimensions are derived from it
 */
type ImageSizingProps =
  | {
      /** Fill the nearest positioned ancestor. The ancestor is responsible for sizing/aspect ratio. */
      fill: true
      width?: never
      height?: never
      /** Optional aspect ratio, still useful for blur placeholder generation. */
      aspectRatio?: number
    }
  | {
      fill?: false
      /** Intrinsic width in pixels. Required alongside `height` when `aspectRatio` isn't provided. */
      width: number
      /** Intrinsic height in pixels. Required alongside `width` when `aspectRatio` isn't provided. */
      height: number
      aspectRatio?: number
    }
  | {
      fill?: false
      width?: never
      height?: never
      /** Aspect ratio (width / height) — layout dimensions are derived from it. */
      aspectRatio: number
    }

/**
 * `sizes` variants. Every render must declare how wide the image actually
 * renders — there is no `100vw` fallback. A wrong-by-default `sizes` doesn't
 * error or warn; it just tells the browser to fetch a full-viewport-width
 * candidate for what might be an 89px thumbnail, and nothing short of
 * measuring network requests in a browser catches it. Pick one:
 * - `mobileSize` + `desktopSize`: the common two-breakpoint case
 * - `sizes`: a raw sizes string, for layouts the two-breakpoint form can't express
 */
type ImageSizesProps =
  | {
      /** Rendered width below the desktop breakpoint (e.g. "50vw"). */
      mobileSize: `${number}vw`
      /** Rendered width at/above the desktop breakpoint (e.g. "33vw"). */
      desktopSize: `${number}vw`
      sizes?: never
    }
  | {
      mobileSize?: never
      desktopSize?: never
      /** Raw `sizes` attribute, for layouts `mobileSize`/`desktopSize` can't express. */
      sizes: string
    }

/**
 * Props extending Next.js Image.
 *
 * Sizing is required (`fill`, `width`+`height`, or `aspectRatio`): an image
 * with no reserved box shifts layout when it loads, so the types enforce a
 * path instead of faking dimensions.
 *
 * `sizes` is required too (`mobileSize`+`desktopSize`, or a raw `sizes`
 * string); there is no `100vw` fallback, see `ImageSizesProps`.
 */
export type ImageProps = Omit<
  NextImageProps,
  'objectFit' | 'alt' | 'width' | 'height' | 'fill' | 'sizes'
> & {
  /**
   * Omitted by default: the visual default (`cover`) comes from a
   * zero-specificity CSS rule, so a consumer CSS Module or Tailwind `object-*`
   * utility can override it. Passing this prop applies an inline style, which
   * wins over both.
   */
  objectFit?: CSSProperties['objectFit']
  ref?: Ref<HTMLImageElement>
  /** Alt text for accessibility. Required — pass `alt=""` explicitly for decorative images. */
  alt: string
} & ImageSizingProps &
  ImageSizesProps

function toBase64(str: string): string {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- SSR guard; literal typeof enables bundler dead-code elimination
  return typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : btoa(str)
}

function isStringSrc(src: NextImageProps['src']): src is string {
  return typeof src === 'string'
}

function generateShimmer(w: number, h: number): string {
  return `
  <svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <linearGradient id="g">
        <stop stop-color="oklch(1 0 0 / 0.1)" offset="20%" />
        <stop stop-color="oklch(1 0 0 / 0.2)" offset="50%" />
        <stop stop-color="oklch(1 0 0 / 0.1)" offset="70%" />
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="oklch(0 0 0 / 0)" />
    <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
    <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
  </svg>`
}

// Base for deriving placeholder width/height from an aspectRatio-only render,
// so the reserved box keeps its proportions instead of a fake 1x1.
const BASE_PLACEHOLDER_DIMENSION = 1000

function derivePlaceholderDimensions(aspectRatio: number) {
  return aspectRatio >= 1
    ? {
        width: BASE_PLACEHOLDER_DIMENSION,
        height: Math.round(BASE_PLACEHOLDER_DIMENSION / aspectRatio),
      }
    : {
        width: Math.round(BASE_PLACEHOLDER_DIMENSION * aspectRatio),
        height: BASE_PLACEHOLDER_DIMENSION,
      }
}

function shouldUseBlurPlaceholder(
  src: NextImageProps['src'],
  placeholder: string,
  blurDataURL: string | undefined
): boolean {
  if (!src) return false
  const isSvg = isStringSrc(src) && src.includes('.svg')
  return !isSvg && placeholder === 'blur' && !blurDataURL
}

function generateBlurDataURL(
  shouldUse: boolean,
  aspectRatio: number | undefined,
  existingBlurDataURL: string | undefined
): string | undefined {
  if (!(shouldUse && aspectRatio)) return existingBlurDataURL

  const shimmerSvg = generateShimmer(700, Math.round(700 / aspectRatio))
  return `data:image/svg+xml;base64,${toBase64(shimmerSvg)}`
}

function getFinalPlaceholder(
  shouldUse: boolean,
  aspectRatio: number | undefined,
  blurDataURL: string | undefined,
  originalPlaceholder: NextImageProps['placeholder']
): NextImageProps['placeholder'] {
  if (!shouldUse) {
    return originalPlaceholder === 'blur' && !blurDataURL
      ? 'empty'
      : originalPlaceholder
  }

  return aspectRatio || blurDataURL ? 'blur' : 'empty'
}

/**
 * Responsive image with blur placeholders, lazy loading by default and
 * required sizing. Usage and props: `./README.md`.
 *
 * `preload` aliases next/image's native `preload` (the replacement for the
 * deprecated `priority`) and also sets `loading="eager"` unless `loading` is
 * given.
 */
export function Image({
  style,
  className,
  loading,
  objectFit,
  quality = 90,
  alt,
  fill,
  width,
  height,
  mobileSize,
  desktopSize,
  sizes,
  src,
  unoptimized,
  ref,
  aspectRatio,
  placeholder = 'blur',
  preload = false,
  ...props
}: ImageProps) {
  const finalLoading = loading ?? (preload ? 'eager' : 'lazy')

  const finalSizes =
    sizes ?? `(min-width: ${breakpoints.dt}px) ${desktopSize}, ${mobileSize}`

  if (!src) return null

  const isSvg = isStringSrc(src) && src.includes('.svg')
  const shouldUsePlaceholder = shouldUseBlurPlaceholder(
    src,
    placeholder,
    props.blurDataURL
  )
  const blurDataURL = generateBlurDataURL(
    shouldUsePlaceholder,
    aspectRatio,
    props.blurDataURL
  )
  const finalPlaceholder = getFinalPlaceholder(
    shouldUsePlaceholder,
    aspectRatio,
    props.blurDataURL,
    placeholder
  )

  // aspectRatio-only variant: proportional placeholder dims, not a fake 1x1.
  const derivedDimensions =
    !fill && width === undefined && height === undefined && aspectRatio
      ? derivePlaceholderDimensions(aspectRatio)
      : undefined

  const finalWidth = width ?? derivedDimensions?.width
  const finalHeight = height ?? derivedDimensions?.height

  // Derived from the sizing union, never an independent prop, so next/image's
  // `fill` can't disagree with `width`/`height` being spread (issue #393).
  const isBlock = !fill

  // Inline only when explicitly passed, so it wins. The unset default
  // (visually `cover`) is the zero-specificity `:where(.img)` rule in
  // image.module.css, which consumer CSS can override. `style` layers on top
  // to override both.
  const baseStyle: CSSProperties = {
    ...(objectFit && { objectFit }),
  }
  if (isBlock && aspectRatio) {
    baseStyle.aspectRatio = aspectRatio
  }
  const finalStyle = { ...baseStyle, ...style }

  return (
    <NextImage
      ref={ref}
      fill={Boolean(fill)}
      {...(finalWidth !== undefined && { width: finalWidth })}
      {...(finalHeight !== undefined && { height: finalHeight })}
      loading={finalLoading}
      quality={quality}
      alt={alt}
      style={finalStyle}
      className={cn(className, s.img, isBlock && s.block)}
      sizes={finalSizes}
      src={src}
      unoptimized={
        unoptimized || isSvg || (isStringSrc(src) && isSanityFile(src))
      }
      // Sanity's CDN resizes its own images; Next's optimizer would only
      // re-encode them. Set here because a loader is a function, which a
      // Server Component can't pass to this Client Component.
      {...(isStringSrc(src) && isSanityImage(src) && { loader: sanityLoader })}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      {...(finalPlaceholder && { placeholder: finalPlaceholder })}
      {...(blurDataURL && { blurDataURL })}
      preload={preload}
      {...props}
    />
  )
}
