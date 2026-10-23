import { useIntersectionObserver } from 'hamo'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

interface UsePrefetchOptions {
  /** Scroll container to observe against. Default: the viewport. */
  root?: HTMLElement | null
  /** Default `50px`, so the fetch starts just before the element shows. */
  rootMargin?: string
  /** Visible fraction (0–1) that counts as intersecting. Default 0. */
  threshold?: number
}

/**
 * Prefetch a route when an element scrolls into view. Skipped on 2G and
 * Save-Data connections. Returns a ref callback for the triggering element;
 * nothing happens while `href` is null.
 */
export function usePrefetch(
  href: Route | null | undefined,
  options: UsePrefetchOptions = {}
) {
  const router = useRouter()
  const prefetchedRef = useRef(false)
  // hamo keeps the first callback, so read `href` through a ref.
  const hrefRef = useRef(href)

  useEffect(() => {
    hrefRef.current = href
  })

  const [setElement] = useIntersectionObserver({
    rootMargin: '50px',
    ...options,
    lazy: true,
    callback: (entry) => {
      const target = hrefRef.current
      if (!target || prefetchedRef.current || !entry?.isIntersecting) return

      // SAFETY: Network Information API's `navigator.connection` is present
      // on Chromium but absent from the DOM lib types.
      const connection = (
        navigator as Navigator & {
          connection?: NetworkInformation
        }
      ).connection

      const shouldPrefetch =
        !connection ||
        (connection.effectiveType !== 'slow-2g' &&
          connection.effectiveType !== '2g' &&
          !connection.saveData)

      if (shouldPrefetch) {
        router.prefetch(target)
        prefetchedRef.current = true
      }
    },
  })

  return setElement
}

interface NetworkInformation {
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
  readonly saveData: boolean
  readonly rtt?: number
  readonly downlink?: number
}
