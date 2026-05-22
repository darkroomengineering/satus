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

type CustomLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof ComponentProps<typeof NextLink> | 'href'
> &
  Omit<ComponentProps<typeof NextLink>, 'href'> & {
    href?: string
    onClick?: (e: MouseEvent<HTMLElement>) => void
    scroll?: boolean
  }

function isExternalHref(href: string) {
  return href.startsWith('http://') || href.startsWith('https://')
}

export function Link({
  href,
  children,
  onClick,
  scroll = false, // Default to false to prevent scroll restoration warnings with fixed/sticky elements
  ...props
}: CustomLinkProps) {
  const pathname = usePathname()
  const isActive = Boolean(href && pathname === href)

  // Seed external from the SSR-safe URL pattern so hydration starts in agreement; refine on mount if same-host URL targets a different origin.
  const [isExternal, setIsExternal] = useState(() =>
    href ? isExternalHref(href) : false
  )
  const [shouldPrefetch, setShouldPrefetch] = useState(false)

  useEffect(() => {
    if (!href) return

    try {
      const url = new URL(href, window.location.href)
      setIsExternal(url.host !== window.location.host)
    } catch {
      setIsExternal(false)
    }

    const connection = (
      navigator as Navigator & {
        connection?: { effectiveType: string; saveData: boolean }
      }
    ).connection
    if (connection) {
      const { effectiveType, saveData } = connection
      setShouldPrefetch(effectiveType === '4g' && !saveData)
    } else {
      setShouldPrefetch(true)
    }
  }, [href])

  // No href + onClick → button
  if (!href && onClick) {
    const {
      target: _t,
      rel: _r,
      'data-external': _de,
      ...buttonProps
    } = props as Record<string, unknown>
    return (
      <button
        onClick={(e: MouseEvent<HTMLButtonElement>) => onClick(e)}
        type="button"
        {...buttonProps}
      >
        {children}
      </button>
    )
  }

  // No href and no onClick → div
  if (!href) {
    const {
      target: _t,
      rel: _r,
      'data-external': _de,
      ...divProps
    } = props as Record<string, unknown>
    return <div {...divProps}>{children}</div>
  }

  if (isExternal) {
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
      {...(onClick && { onClick })}
      {...props}
    >
      {children}
    </NextLink>
  )
}
