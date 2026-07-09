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
    /**
     * Force new-tab behavior (target="_blank" + rel="noopener noreferrer")
     * even for a relative/internal href. `isExternalHref` already covers
     * absolute http(s) URLs automatically — this is only for the rare case
     * of an internal route that should still open in a new tab (e.g. a
     * proxied Storybook route).
     */
    newTab?: boolean | undefined
  }

/**
 * Single source of truth for "is this href external". Absolute http(s) URLs
 * are external; everything else (relative paths, hashes, mailto:, etc.) is
 * treated as internal. Exported so callers that build their own nav data
 * (e.g. Header) can derive the same external-arrow/new-tab intent instead of
 * hand-authoring a parallel `external` flag that can drift from this logic.
 */
export function isExternalHref(href: string) {
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
  newTab = false,
  ...props
}: CustomLinkProps) {
  const pathname = usePathname()
  const isActive = Boolean(href && pathname === href)

  // Derived during render straight from `href`. The string check is
  // deterministic on both server and client, so the SSR markup and the first
  // client render always agree — no mirror state + effect needed.
  const opensNewTab = Boolean(href && isExternalHref(href)) || newTab

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
      ...divProps
    } = props as Record<string, unknown>
    return <div {...divProps}>{children}</div>
  }

  // New-tab links (external or explicit `newTab`) ride the same NextLink —
  // it passes `target`/`rel` through to the anchor, skips client routing for
  // absolute URLs on its own, and prefetching a new-tab destination is waste.
  return (
    <NextLink
      href={href as ComponentProps<typeof NextLink>['href']}
      prefetch={opensNewTab ? false : shouldPrefetch}
      scroll={scroll}
      data-active={isActive || undefined}
      {...(opensNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
      {...(onClick && { onClick })}
      {...props}
    >
      {children}
    </NextLink>
  )
}
