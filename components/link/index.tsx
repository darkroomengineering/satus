'use client'

import { useLenis } from 'lenis/react'
import NextLink, { type LinkProps as NextLinkProps } from 'next/link'
import { usePathname } from 'next/navigation'
import type { ElementType, HTMLAttributes, Ref } from 'react'

interface LinkProps
  extends HTMLAttributes<HTMLAnchorElement>,
    Omit<NextLinkProps, 'href'> {
  href?: string
  fallback?: ElementType
  ref?: Ref<HTMLAnchorElement>
}

type InternalLinkProps = LinkProps & {
  target?: string
  rel?: string
}

export function Link({
  href,
  fallback = 'div',
  onClick,
  ref,
  ...props
}: LinkProps) {
  const lenis = useLenis()
  const pathname = usePathname()

  if (!href || typeof href !== 'string') {
    const Tag = fallback

    return <Tag ref={ref} onClick={onClick} {...props} href={href} />
  }

  const isExternal = href.startsWith('http')

  const internalLinkProps: InternalLinkProps = {
    ...props,
    target: isExternal ? '_blank' : undefined,
    rel: isExternal ? 'noopener noreferrer' : undefined,
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
      {...internalLinkProps}
      href={href}
    />
  )
}
