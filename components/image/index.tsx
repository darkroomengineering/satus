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
}

export function Image({
  style,
  className,
  loading = 'eager',
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
  ...props
}: ImageProps) {
  if (!src) return

  sizes =
    sizes || `(max-width: ${breakpoints.dt}px) ${mobileSize}, ${desktopSize}`

  return (
    <NextImage
      ref={ref}
      fill={!block}
      width={width}
      height={height}
      loading={loading}
      quality={quality}
      alt={alt}
      style={{
        objectFit,
        ...style,
      }}
      className={cn(className, block && s.block)}
      sizes={sizes}
      src={src}
      unoptimized={
        unoptimized || (typeof src === 'string' && src?.includes('.svg'))
      }
      draggable="false"
      onDragStart={(e) => e.preventDefault()}
      {...props}
    />
  )
}
