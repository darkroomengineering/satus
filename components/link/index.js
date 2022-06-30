import NextLink from 'next/link'
import { forwardRef } from 'react'

export const Link = forwardRef(
  (
    {
      href,
      onClick = () => {},
      onMouseEnter = () => {},
      onMouseLeave = () => {},
      children,
      className,
      style,
    },
    ref
  ) => {
    const attributes = {
      ref,
      onClick,
      onMouseEnter,
      onMouseLeave,
      className,
      style,
    }

    if (typeof href !== 'string') {
      return <button {...attributes}>{children}</button>
    }

    const isProtocol = href?.startsWith('mailto:') || href?.startsWith('tel:')

    if (isProtocol) {
      return (
        <a
          {...attributes}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      )
    }

    const isAnchor = href?.startsWith('#')
    const isExternal = href?.startsWith('http')
    if (!isExternal && !href?.startsWith('/')) {
      href = `/${href}`
    }

    return (
      <NextLink href={href} passHref={isExternal || isAnchor}>
        <a
          {...attributes}
          {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
        >
          {children}
        </a>
      </NextLink>
    )
  }
)

Link.displayName = 'Link'
