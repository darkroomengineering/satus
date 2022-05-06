import NextLink from 'next/link'
import { forwardRef } from 'react'

export const Link = forwardRef(
  (
    {
      href = '/',
      onClick = () => {},
      onMouseEnter = () => {},
      onMouseLeave = () => {},
      children,
      className,
      style,
    },
    ref
  ) => {
    if (typeof href !== 'string') {
      href = '/'
    }

    const isProtocol = href?.startsWith('mailto:') || href?.startsWith('tel:')

    if (isProtocol) {
      return (
        <a
          href={href}
          className={className}
          style={style}
          ref={ref}
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
          ref={ref}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
          className={className}
          style={style}
        >
          {children}
        </a>
      </NextLink>
    )
  }
)

Link.displayName = 'Link'
