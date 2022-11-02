import cn from 'clsx'
import NextImage from 'next/image'
import s from './image.module.scss'

export function Image({
  className,
  style,
  loading = 'eager',
  objectFit = 'cover',
  quality = 90,
  alt = '',
  ...props
}) {
  return (
    <NextImage
      {...props}
      className={cn(s.image, className)}
      style={{ objectFit, ...style }}
      loading={loading}
      quality={quality}
      alt={alt}
    />
  )
}
