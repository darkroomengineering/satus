'use client'

import cn from 'clsx'
import NextImage from 'next/image'
import { forwardRef } from 'react'
import { breakpoints } from 'styles/config'
import s from './image.module.css'

export const Image = forwardRef(function Image(
  {
    style,
    className,
    loading = 'eager',
    objectFit = 'cover',
    quality = 90,
    alt = '',
    block = true,
    width = block ? 1 : undefined,
    height = block ? 1 : undefined,
    mobileSize = '100vw',
    desktopSize = '100vw',
    sizes,
    src,
    unoptimized,
    ...props
  },
  ref
) {
  sizes =
    sizes ||
    `(max-width: ${Number.parseFloat(breakpoints.dt)}px) ${mobileSize}, ${desktopSize}`

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
      unoptimized={unoptimized ?? src?.includes('.svg')}
      draggable="false"
      onDragStart={(e) => e.preventDefault()}
      {...props}
    />
  )
})
