'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

export function RoutePerformanceTracker() {
  const pathname = usePathname()
  const startTime = useRef<number>(0)

  useEffect(() => {
    // Track route change timing
    if (startTime.current > 0) {
      const duration = performance.now() - startTime.current

      if (process.env.NODE_ENV === 'development') {
        console.log(`Route change to ${pathname} took ${duration.toFixed(2)}ms`)
      }

      // Send to analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'timing_complete', {
          name: 'route_change',
          value: Math.round(duration),
          event_category: 'Navigation',
          event_label: pathname,
        })
      }
    }

    startTime.current = performance.now()
  }, [pathname])

  return null
}
