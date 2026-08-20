'use client'

/**
 * Enhanced Image Component
 *
 * Next.js Image wrapper with optimized defaults and error handling.
 * Always use this component instead of next/image directly.
 *
 * Note: This is a Client Component due to event handlers (onDragStart).
 * Blur placeholders are still generated efficiently via blurDataURL prop.
 */

import cn from 'clsx'
import NextImage, { type ImageProps as NextImageProps } from 'next/image'
import type { CSSProperties, Ref } from 'react'

import { breakpoints } from '@/styles/config'

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
 * Enhanced Image component props extending Next.js Image.
 *
 * Adds responsive sizing, aspect ratio support, and automatic blur placeholders.
 * Always use this component instead of next/image directly.
 *
 * Sizing is required: pass `fill`, explicit `width`+`height`, or `aspectRatio`.
 * There is no dimension-less fallback — an image with no reserved box causes
 * layout shift when it loads, so the type system enforces one of these paths
 * instead of silently faking dimensions.
 *
 * `sizes` is required too: pass `mobileSize`+`desktopSize`, or a raw `sizes`
 * string. There is no `100vw` fallback — see `ImageSizesProps`.
 */
export type ImageProps = Omit<
  NextImageProps,
  'objectFit' | 'alt' | 'width' | 'height' | 'fill' | 'sizes'
> & {
  /**
   * CSS object-fit property for image positioning. Omitted by default — the
   * visual default (`cover`) comes from a zero-specificity CSS rule instead
   * of an inline style, so a consumer CSS Module or Tailwind `object-*`
   * utility can override it without fighting inline-style specificity.
   * Passing this prop explicitly still applies it as an inline style, which
   * wins over both.
   */
  objectFit?: CSSProperties['objectFit']
  /** Ref for accessing the underlying img element */
  ref?: Ref<HTMLImageElement>
  /** Alt text for accessibility. Required — pass `alt=""` explicitly for decorative images. */
  alt: string
} & ImageSizingProps &
  ImageSizesProps

// Base64 encoding for blur placeholders (works in browser and Node.js)
function toBase64(str: string): string {
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- SSR guard; literal typeof enables bundler dead-code elimination
  return typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : btoa(str)
}

function isStringSrc(src: NextImageProps['src']): src is string {
  return typeof src === 'string'
}

// Helper to generate blur placeholder with transparent background by default
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

// Base dimension used to derive honest placeholder width/height from an
// aspectRatio-only render (no explicit width/height supplied). Keeps the
// reserved box's proportions correct instead of faking a square (1x1).
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

// Helper to determine if blur placeholder should be used
function shouldUseBlurPlaceholder(
  src: NextImageProps['src'],
  placeholder: string,
  blurDataURL: string | undefined
): boolean {
  if (!src) return false
  const isSvg = isStringSrc(src) && src.includes('.svg')
  return !isSvg && placeholder === 'blur' && !blurDataURL
}

// Helper to generate blur data URL
function generateBlurDataURL(
  shouldUse: boolean,
  aspectRatio: number | undefined,
  existingBlurDataURL: string | undefined
): string | undefined {
  if (!(shouldUse && aspectRatio)) return existingBlurDataURL

  const shimmerSvg = generateShimmer(700, Math.round(700 / aspectRatio))
  return `data:image/svg+xml;base64,${toBase64(shimmerSvg)}`
}

// Helper to determine final placeholder value
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
 * Enhanced Image component with responsive sizing and automatic optimizations.
 *
 * Always use this component instead of next/image directly. Provides:
 * - Automatic responsive sizes generation
 * - Smart blur placeholders with aspect ratio support
 * - Performance optimizations (lazy loading by default)
 * - Preload for LCP images
 *
 * @param props - Image props extending Next.js Image
 * @param props.aspectRatio - Aspect ratio for layout stability and blur placeholder
 * @param props.mobileSize - Rendered width below the desktop breakpoint (e.g. "50vw"). Required together with `desktopSize`, unless `sizes` is passed instead.
 * @param props.desktopSize - Rendered width at/above the desktop breakpoint (e.g. "33vw"). Required together with `mobileSize`, unless `sizes` is passed instead.
 * @param props.preload - Ergonomic alias for next/image's native `preload` prop
 *   (the modern replacement for the deprecated `priority` prop). Also sets
 *   `loading="eager"` unless `loading` is explicitly provided.
 *
 * @example
 * ```tsx
 * // Basic usage with aspect ratio
 * <Image
 *   src="/hero.jpg"
 *   alt="Hero image"
 *   aspectRatio={16/9}
 *   mobileSize="100vw"
 *   desktopSize="100vw"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // LCP image with preload
 * <Image
 *   src="/hero.jpg"
 *   alt="Hero image"
 *   aspectRatio={16/9}
 *   mobileSize="100vw"
 *   desktopSize="100vw"
 *   preload // Preloads image for LCP
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Responsive grid image
 * <Image
 *   src="/product.jpg"
 *   alt="Product"
 *   aspectRatio={1}
 *   mobileSize="100vw"
 *   desktopSize="33vw"
 * />
 * ```
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
  // Determine loading strategy
  const finalLoading = loading ?? (preload ? 'eager' : 'lazy')

  // Compute `sizes` from whichever branch of ImageSizesProps was supplied.
  const finalSizes =
    sizes ?? `(min-width: ${breakpoints.dt}px) ${desktopSize}, ${mobileSize}`

  if (!src) return null

  // Determine SVG status and placeholder logic
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

  // Derive placeholder dimensions from aspectRatio when no explicit
  // width/height were supplied (the aspectRatio-only sizing variant).
  // Honest proportional dims instead of a fake 1x1 box.
  const derivedDimensions =
    !fill && width === undefined && height === undefined && aspectRatio
      ? derivePlaceholderDimensions(aspectRatio)
      : undefined

  const finalWidth = width ?? derivedDimensions?.width
  const finalHeight = height ?? derivedDimensions?.height

  // Derived purely from the sizing union — never an independent prop, so
  // the value passed to next/image's `fill` can never disagree with whether
  // `width`/`height` are also being spread in (issue #393).
  const isBlock = !fill

  // Only set inline when explicitly passed — an explicit request should
  // always win. The unset default (visually `cover`) comes from the
  // zero-specificity `:where(.img)` rule in image.module.css instead, so
  // consumer CSS (module or utility) can override it. Built as statements
  // (rather than conditional spreads) so each property is added only when
  // present, then `style` is layered on top to let it override both.
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
      unoptimized={unoptimized || isSvg}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      {...(finalPlaceholder && { placeholder: finalPlaceholder })}
      {...(blurDataURL && { blurDataURL })}
      preload={preload}
      {...props}
    />
  )
}
