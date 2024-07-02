'use client'

import cn from 'clsx'
import NextImage from 'next/image'
import { forwardRef } from 'react'
import variables from 'styles/config.js'
import s from './image.module.scss'

export const Image = forwardRef(function Image(
  {
    style,
    className,
    loading = 'eager',
    objectFit = 'cover',
    quality = 90,
    alt = '',
    block,
    width = block && 1,
    height = block && 1,
    fill = typeof width === 'undefined' || typeof height === 'undefined',
    mobileSize = '100vw',
    desktopSize = '100vw',
    sizes = `(max-width: ${parseFloat(variables.breakpoints.mobile)}px) ${mobileSize}, ${desktopSize}`,
    src,
    unoptimized,
    ...props
  },
  ref,
) {
  return (
    <NextImage
      ref={ref}
      fill={fill}
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
