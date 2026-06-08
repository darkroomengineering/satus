'use client'

import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import {
  type AnchorHTMLAttributes,
  type ComponentProps,
  type MouseEvent,
  useSyncExternalStore,
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

// Browser Network Information API (not in the DOM lib types). Present on Chromium.
function getConnection():
  | (EventTarget & { effectiveType: string; saveData: boolean })
  | undefined {
  return (
    navigator as Navigator & {
      connection?: EventTarget & { effectiveType: string; saveData: boolean }
    }
  ).connection
}

// Prefetch on fast, non-data-saving connections. Exposed via useSyncExternalStore
// so the value is SSR-safe (server snapshot below) without a mount effect, and
// re-reads if the connection quality changes.
function subscribeConnection(onChange: () => void) {
  const connection = getConnection()
  connection?.addEventListener('change', onChange)
  return () => connection?.removeEventListener('change', onChange)
}
function getShouldPrefetch() {
  const connection = getConnection()
  if (!connection) return true
  return connection.effectiveType === '4g' && !connection.saveData
}
function getServerShouldPrefetch() {
  return false
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

  // Derived during render straight from `href`. The string check is
  // deterministic on both server and client, so the SSR markup and the first
  // client render always agree — no mirror state + effect needed.
  const isExternal = href ? isExternalHref(href) : false

  // Prefetch hint from the browser Network Information API. Read via
  // useSyncExternalStore so it's SSR-safe (server snapshot = false) with no
  // mount effect, and re-reads if the connection quality changes.
  const shouldPrefetch = useSyncExternalStore(
    subscribeConnection,
    getShouldPrefetch,
    getServerShouldPrefetch
  )

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
