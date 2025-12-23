'use client'

import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import {
  type AnchorHTMLAttributes,
  type ComponentProps,
  type MouseEvent,
  useEffect,
  useState,
} from 'react'

// import { usePageTransitionNavigate } from '../page-transition/context'

type CustomLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof ComponentProps<typeof NextLink> | 'href'
> &
  Omit<ComponentProps<typeof NextLink>, 'href'> & {
    href?: string
    onClick?: (e: MouseEvent<HTMLElement>) => void
    scroll?: boolean
  }

export function Link({
  href,
  children,
  onClick,
  scroll = false, // Default to false to prevent scroll restoration warnings with fixed/sticky elements
  ...props
}: CustomLinkProps) {
  const pathname = usePathname()
  const [shouldPrefetch, setShouldPrefetch] = useState(false)
  const [isExternal, setIsExternal] = useState(false)

  useEffect(() => {
    // Skip if no href
    if (!href) return

    // Check if external link
    try {
      const url = new URL(href, window.location.href)
      setIsExternal(url.host !== window.location.host)
    } catch {
      setIsExternal(false)
    }

    // Only prefetch on good connections
    const connection = (
      navigator as Navigator & {
        connection?: { effectiveType: string; saveData: boolean }
      }
    ).connection
    if (connection) {
      const { effectiveType, saveData } = connection
      setShouldPrefetch(effectiveType === '4g' && !saveData)
    } else {
      // Default to prefetching if API not available
      setShouldPrefetch(true)
    }
  }, [href])

  // If no href is provided but there's an onClick, render a button
  if (!href && onClick) {
    return (
      <button
        onClick={(e: MouseEvent<HTMLButtonElement>) => onClick(e)}
        type="button"
        {...(props as React.ComponentProps<'button'>)}
      >
        {children}
      </button>
    )
  }

  // If no href and no onClick, render a div
  if (!href) {
    return <div {...(props as React.ComponentProps<'div'>)}>{children}</div>
  }

  const isActive = pathname === href

  // For SSR, check if it's external based on the href pattern
  const isExternalSSR =
    href.startsWith('http://') || href.startsWith('https://')

  if (isExternalSSR || isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-external
        onClick={onClick}
        {...props}
      >
        {children}
      </a>
    )
  }

  return (
    <NextLink
      href={href as ComponentProps<typeof NextLink>['href']}
      prefetch={shouldPrefetch}
      scroll={scroll}
      data-active={isActive || undefined}
      onClick={onClick}
      {...props}
    >
      {children}
    </NextLink>
  )
}
