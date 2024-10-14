'use client'

import { useLenis } from 'libs/lenis'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { forwardRef } from 'react'

export const Link = forwardRef(function Link(
  { href, fallback = 'div', onClick, ...props },
  ref,
) {
  const lenis = useLenis() // eslint-disable-line
  const pathname = usePathname()

  if (!href || typeof href !== 'string') {
    const Tag = fallback

    return <Tag ref={ref} onClick={onClick} {...props} href={href} />
  }

  const isExternal = href.startsWith('http')

  if (isExternal) {
    props.target = '_blank'
    props.rel = 'noopener noreferrer'
  }

  const isAnchor = href.startsWith('#') || href.startsWith(`${pathname}#`)

  return (
    <NextLink
      ref={ref}
      onClick={(e) => {
        if (isAnchor && lenis) {
          e.preventDefault()
          lenis.scrollTo(href)
        }
        onClick?.(e)
      }}
      {...props}
      href={href}
    />
  )
})
