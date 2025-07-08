import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

/**
 * Hook to prefetch a route when an element becomes visible in the viewport
 * @param href - The route to prefetch
 * @param options - Intersection Observer options
 * @returns ref to attach to the element that should trigger prefetching
 */
export function usePrefetch<T extends HTMLElement = HTMLElement>(
  href: string | null | undefined,
  options?: IntersectionObserverInit
) {
  const ref = useRef<T>(null)
  const router = useRouter()
  const prefetchedRef = useRef(false)
  const connectionRef = useRef<NetworkInformation | null>(null)

  // Memoize the observer callback to avoid recreating on every render
  // Note: With React 19 compiler, this might be auto-optimized, but it's still good practice
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry?.isIntersecting && !prefetchedRef.current && href) {
        // Check network conditions before prefetching
        const connection = (
          navigator as Navigator & {
            connection?: NetworkInformation
          }
        ).connection
        connectionRef.current = connection || null

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
    },
    [href, router]
  )

  useEffect(() => {
    // Early return if no href or already prefetched
    if (!href || prefetchedRef.current) return

    const element = ref.current
    if (!element) return

    // Reset prefetched state when href changes
    prefetchedRef.current = false

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: '50px',
      ...options,
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [href, handleIntersection, options])

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
