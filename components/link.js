'use client'

import NextLink from 'next/link'
import { forwardRef } from 'react'

export const Link = forwardRef(function Link(
  { href, fallback = 'div', ...props },
  ref,
) {
  if (typeof href !== 'string') {
    const Tag = fallback

    return <Tag ref={ref} {...props} href={href} />
  }

  return <NextLink ref={ref} {...props} href={href} />
})
