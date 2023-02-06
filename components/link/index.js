import NextLink from 'next/link'
import { forwardRef } from 'react'

const SHALLOW_URLS = ['?demo=true']

export const Link = forwardRef(
  ({ href, children, className, shallow, ...props }, ref) => {
    const attributes = {
      ref,
      className,
      ...props,
    }

    const isProtocol = href?.startsWith('mailto:') || href?.startsWith('tel:')
    const needsShallow = !!SHALLOW_URLS.find((url) => href?.includes(url))
    // const isAnchor = href?.startsWith('#')
    const isExternal = href?.startsWith('http')

    if (typeof href !== 'string') {
      return <button {...attributes}>{children}</button>
    }

    // if (isProtocol || isExternal) {
    //   return (
    //     <a
    //       {...attributes}
    //       href={href}
    //       target="_blank"
    //       rel="noopener noreferrer"
    //     >
    //       {children}
    //     </a>
    //   )
    // }

    // return (
    //   <NextLink
    //     href={href}
    //     passHref={isAnchor}
    //     shallow={needsShallow || shallow}
    //     {...attributes}
    //     {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
    //   >
    //     {children}
    //   </NextLink>
    // )

    return (
      <NextLink
        href={href}
        shallow={needsShallow || shallow}
        {...(isProtocol || isExternal
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
        {...attributes}
      >
        {children}
      </NextLink>
    )
  }
)

Link.displayName = 'Link'
