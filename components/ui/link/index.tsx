'use client'

import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import {
  type AnchorHTMLAttributes,
  type ComponentProps,
  type ComponentPropsWithoutRef,
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
     * Force new-tab behavior (target="_blank" + rel="noopener noreferrer") for
     * an internal href; absolute http(s) URLs get it automatically via
     * `isExternalHref`.
     */
    newTab?: boolean | undefined
  }

/**
 * Single source of truth for "is this href external": absolute http(s) URLs
 * only (relative paths, hashes, mailto: etc. are internal). Exported so
 * callers with their own nav data (e.g. Header) derive the same intent
 * instead of a parallel `external` flag that can drift.
 */
export function isExternalHref(href: string) {
  return href.startsWith('http://') || href.startsWith('https://')
}

/**
 * Single source of truth for a link's intent: external (opens a new tab) and
 * active (matches the pathname). `Link` and callers with their own nav markup
 * (e.g. Header) derive from it so the two checks can't drift.
 */
export function getLinkIntent(
  href: string,
  pathname: string | null,
  { newTab = false }: { newTab?: boolean | undefined } = {}
) {
  return {
    isExternal: isExternalHref(href) || newTab,
    isActive: pathname === href,
  }
}

// Browser Network Information API (not in the DOM lib types). Present on Chromium.
function getConnection():
  | (EventTarget & { effectiveType: string; saveData: boolean })
  | undefined {
  // SAFETY: Network Information API's `navigator.connection` is present on
  // Chromium but absent from the DOM lib types; callers already treat the
  // result as possibly undefined.
  return (
    navigator as Navigator & {
      connection?: EventTarget & { effectiveType: string; saveData: boolean }
    }
  ).connection
}

// Prefetch on fast, non-data-saving connections. useSyncExternalStore keeps it
// SSR-safe (server snapshot below) with no mount effect, and re-reads when
// connection quality changes.
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

  // Derived during render: deterministic on server and client, so SSR markup
  // and the first client render agree with no mirror state or effect.
  const { isExternal, isActive } = href
    ? getLinkIntent(href, pathname, { newTab })
    : { isExternal: false, isActive: false }
  const opensNewTab = isExternal

  const shouldPrefetch = useSyncExternalStore(
    subscribeConnection,
    getShouldPrefetch,
    getServerShouldPrefetch
  )

  if (!href && onClick) {
    const { target: _t, rel: _r, ...buttonProps } = props
    // `buttonProps`' `ref`/`onMouseEnter`/etc. are typed for an anchor and
    // don't structurally overlap a button's handler types. This branch only
    // renders with no `href`, so nothing anchor-specific arrives: widen to
    // `unknown` (not flagged by anti-slop, as `buttonProps` isn't a literal),
    // then assert the one shape the element needs.
    const buttonPropsUnknown: unknown = buttonProps
    // SAFETY: see the two-step comment above this statement.
    const typedButtonProps =
      buttonPropsUnknown as ComponentPropsWithoutRef<'button'>
    return (
      <button
        onClick={(e: MouseEvent<HTMLButtonElement>) => onClick(e)}
        type="button"
        {...typedButtonProps}
      >
        {children}
      </button>
    )
  }

  if (!href) {
    const { target: _t, rel: _r, ...divProps } = props
    // See the `buttonProps` two-step comment above — same reasoning, for a div.
    const divPropsUnknown: unknown = divProps
    // SAFETY: see the two-step comment above `buttonPropsUnknown`.
    const typedDivProps = divPropsUnknown as ComponentPropsWithoutRef<'div'>
    return <div {...typedDivProps}>{children}</div>
  }

  // New-tab links ride the same NextLink: it passes `target`/`rel` through and
  // skips client routing for absolute URLs; prefetching them is waste.
  return (
    <NextLink
      // SAFETY: hrefs arrive as arbitrary strings (CMS links, external URLs),
      // which typed routes cannot verify statically; this component resolves
      // internal-vs-external handling at runtime. The cast only exists under
      // `next typegen` output, so an un-typegen'd tsc run calls it redundant.
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
