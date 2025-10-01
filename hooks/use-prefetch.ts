import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Hook to prefetch a route when an element becomes visible in the viewport
 * @param href - The route to prefetch
 * @param options - Intersection Observer options
 * @returns ref to attach to the element that should trigger prefetching
 */
export function usePrefetch<T extends HTMLElement = HTMLElement>(
  href: Route | null | undefined,
  options?: IntersectionObserverInit
) {
  const ref = useRef<T>(null)
  const router = useRouter()
  const prefetchedRef = useRef(false)

  useEffect(() => {
    // Early return if no href or already prefetched
    if (!href || prefetchedRef.current) return

    const element = ref.current
    if (!element) return

    // Reset prefetched state when href changes
    prefetchedRef.current = false

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry?.isIntersecting && !prefetchedRef.current) {
        // Check network conditions before prefetching
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
          router.prefetch(href)
          prefetchedRef.current = true
        }
      }
    }

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: '50px',
      ...options,
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [href, options, router])

  // Return null ref if href is not provided
  return href ? ref : { current: null }
}

// TypeScript types for Network Information API
interface NetworkInformation {
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
  readonly saveData: boolean
  readonly rtt?: number
  readonly downlink?: number
}
