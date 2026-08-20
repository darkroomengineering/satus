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

/**
 * Single source of truth for a link's "intent" — whether it's external (and
 * should therefore open in a new tab) and whether it matches the current
 * pathname (and should therefore render as active). Both `Link` itself and
 * callers that build their own nav markup (e.g. Header) derive from this
 * instead of hand-rolling the same two checks, which drift on the first
 * matching-logic change.
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

  // Derived during render straight from `href`. The string check is
  // deterministic on both server and client, so the SSR markup and the first
  // client render always agree — no mirror state + effect needed.
  const { isExternal, isActive } = href
    ? getLinkIntent(href, pathname, { newTab })
    : { isExternal: false, isActive: false }
  const opensNewTab = isExternal

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
    const { target: _t, rel: _r, ...buttonProps } = props
    // `buttonProps` is `CustomLinkProps` minus the explicit named props above
    // and `target`/`rel` — its `ref`/`onMouseEnter`/etc. are typed for an
    // anchor element, which don't structurally overlap with a button's event
    // handler types. Neither this branch's callers pass anchor-specific
    // values here, since it only renders when there is no `href` (a
    // button-shaped `Link` usage) — widen to `unknown` first (never flagged,
    // since `buttonProps` isn't a literal, so it carries no evidence to
    // discard), then assert the one shape this element actually needs.
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

  // No href and no onClick → div
  if (!href) {
    const { target: _t, rel: _r, ...divProps } = props
    // See the `buttonProps` two-step comment above — same reasoning, for a div.
    const divPropsUnknown: unknown = divProps
    // SAFETY: see the two-step comment above `buttonPropsUnknown`.
    const typedDivProps = divPropsUnknown as ComponentPropsWithoutRef<'div'>
    return <div {...typedDivProps}>{children}</div>
  }

  // New-tab links (external or explicit `newTab`) ride the same NextLink —
  // it passes `target`/`rel` through to the anchor, skips client routing for
  // absolute URLs on its own, and prefetching a new-tab destination is waste.
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
