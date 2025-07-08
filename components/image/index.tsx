'use client'

import cn from 'clsx'
import NextImage, { type ImageProps as NextImageProps } from 'next/image'
import type { CSSProperties, Ref } from 'react'
import { breakpoints } from '~/styles/config'
import s from './image.module.css'

export type ImageProps = Omit<NextImageProps, 'objectFit' | 'alt'> & {
  objectFit?: CSSProperties['objectFit']
  block?: boolean
  mobileSize?: `${number}vw`
  desktopSize?: `${number}vw`
  ref?: Ref<HTMLImageElement>
  alt?: string
  aspectRatio?: number
}

// Memoize helper functions to avoid recreation
const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str)

// Helper to generate blur placeholder with transparent background by default
const generateShimmer = (w: number, h: number) => `
  <svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <linearGradient id="g">
        <stop stop-color="rgba(255,255,255,0.1)" offset="20%" />
        <stop stop-color="rgba(255,255,255,0.2)" offset="50%" />
        <stop stop-color="rgba(255,255,255,0.1)" offset="70%" />
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="rgba(0,0,0,0)" />
    <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
    <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
  </svg>`

// Helper to determine if blur placeholder should be used
const shouldUseBlurPlaceholder = (
  src: NextImageProps['src'],
  placeholder: string,
  blurDataURL: string | undefined
): boolean => {
  if (!src) return false
  const isSvg = typeof src === 'string' && src.includes('.svg')
  return !isSvg && placeholder === 'blur' && !blurDataURL
}

// Helper to generate blur data URL
const generateBlurDataURL = (
  shouldUse: boolean,
  aspectRatio: number | undefined,
  existingBlurDataURL: string | undefined
): string | undefined => {
  if (!(shouldUse && aspectRatio)) return existingBlurDataURL

  const shimmerSvg = generateShimmer(700, Math.round(700 / aspectRatio))
  return `data:image/svg+xml;base64,${toBase64(shimmerSvg)}`
}

// Helper to determine final placeholder value
const getFinalPlaceholder = (
  shouldUse: boolean,
  aspectRatio: number | undefined,
  blurDataURL: string | undefined,
  originalPlaceholder: NextImageProps['placeholder']
): NextImageProps['placeholder'] => {
  if (!shouldUse) {
    return originalPlaceholder === 'blur' && !blurDataURL
      ? 'empty'
      : originalPlaceholder
  }

  return aspectRatio || blurDataURL ? 'blur' : 'empty'
}

export function Image({
  style,
  className,
  loading,
  objectFit = 'cover',
  quality = 90,
  alt = '',
  fill,
  block = !fill,
  width = block ? 1 : undefined,
  height = block ? 1 : undefined,
  mobileSize = '100vw',
  desktopSize = '100vw',
  sizes,
  src,
  unoptimized,
  ref,
  aspectRatio,
  placeholder = 'blur',
  priority = false,
  ...props
}: ImageProps) {
  // Determine loading strategy
  const finalLoading = loading ?? (priority ? 'eager' : 'lazy')

  // Generate responsive sizes if not provided
  const finalSizes =
    sizes || `(max-width: ${breakpoints.dt}px) ${mobileSize}, ${desktopSize}`

  // Early return after hooks
  if (!src) return null

  // Determine SVG status and placeholder logic
  const isSvg = typeof src === 'string' && src.includes('.svg')
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

  return (
    <NextImage
      ref={ref}
      fill={!block}
      width={width}
      height={height}
      loading={finalLoading}
      quality={quality}
      alt={alt}
      style={{
        objectFit,
        ...style,
      }}
      className={cn(className, block && s.block)}
      sizes={finalSizes}
      src={src}
      unoptimized={unoptimized || isSvg}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      placeholder={finalPlaceholder}
      blurDataURL={blurDataURL}
      priority={priority}
      {...props}
    />
  )
}
