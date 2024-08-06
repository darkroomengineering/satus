'use client'

import cn from 'clsx'
import NextImage from 'next/image'
import PropTypes from 'prop-types'
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
  ref,
) {
  sizes =
    sizes ||
    `(max-width: ${parseFloat(variables.breakpoints.mobile)}px) ${mobileSize}, ${desktopSize}`

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

Image.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  quality: PropTypes.number,
  objectFit: PropTypes.string,
  loading: PropTypes.string,
  unoptimized: PropTypes.bool,
  block: PropTypes.bool,
  mobileSize: PropTypes.string,
  desktopSize: PropTypes.string,
  sizes: PropTypes.string,
}
