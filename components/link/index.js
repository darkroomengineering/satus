import NextLink from 'next/link'
import { forwardRef } from 'react'

export const Link = forwardRef(
  (
    {
      href = '',
      onClick = () => {},
      onMouseEnter = () => {},
      externalIcon = false,
      children,
      className,
      style,
    },
    ref
  ) => {
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
    const sanitizedHref = isAnchor
      ? `${href}`
      : href?.[0] !== '/' && !isExternal
      ? `/${href}`
      : href

    return (
      <NextLink href={sanitizedHref} passHref={isExternal || isAnchor}>
        <a
          ref={ref}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
          className={className}
          style={style}
        >
          {children} {externalIcon && isExternal && '↗'}
        </a>
      </NextLink>
    )
  }
)

Link.displayName = 'Link'
