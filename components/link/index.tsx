'use client'

import NextLink from 'next/link'
import type { ComponentProps, MouseEvent } from 'react'
// import { usePageTransitionNavigate } from '../page-transition/context'

type LinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  href?: string
  prefetch?: boolean
  onClick?: (e: MouseEvent<HTMLElement>) => void
}

export function Link({
  href,
  onClick,
  prefetch = true,
  children,
  ...props
}: LinkProps) {
  // const navigate = usePageTransitionNavigate()
  const isExternal = href?.startsWith('http')

  // If no href is provided but there's an onClick, render a button
  if (!href && onClick) {
    return (
      <button
        onClick={(e: MouseEvent<HTMLButtonElement>) => onClick(e)}
        type="button"
        {...(props as ComponentProps<'button'>)}
      >
        {children}
      </button>
    )
  }

  // If no href and no onClick, render a div
  if (!href) {
    return <div {...(props as ComponentProps<'div'>)}>{children}</div>
  }

  const linkProps = {
    ...props,
    ...(isExternal && {
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
  }

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)

    // if (!isExternal) {
    // e.preventDefault()
    // navigate(href)
    // }
  }

  return (
    <NextLink
      prefetch={prefetch}
      onClick={handleClick}
      {...linkProps}
      href={href}
    >
      {children}
    </NextLink>
  )
}
