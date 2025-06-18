import { useEffect } from 'react'
import type { Metric } from 'web-vitals'

export function usePerformance() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const reportWebVitals = (metric: Metric) => {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(metric)
      }

      // Send to analytics in production
      if (window.gtag) {
        window.gtag('event', metric.name, {
          event_category: 'Web Vitals',
          event_label: metric.id,
          value: Math.round(
            metric.name === 'CLS' ? metric.value * 1000 : metric.value
          ),
          non_interaction: true,
        })
      }

      // Send to Vercel Analytics
      if (window.va) {
        window.va('event', {
          name: `web-vitals-${metric.name.toLowerCase()}`,
          value: metric.value,
        })
      }
    }

    // Dynamically import web-vitals to reduce initial bundle
    import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
      onCLS(reportWebVitals)
      onFCP(reportWebVitals)
      onLCP(reportWebVitals)
      onTTFB(reportWebVitals)
      onINP(reportWebVitals)
    })
  }, [])
}

// Helper to measure component render time
export function useRenderTime(componentName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime

      if (renderTime > 16) {
        // Longer than one frame
        console.warn(
          `⚠️ ${componentName} took ${renderTime.toFixed(2)}ms to render`
        )
      }
    }
  }, [componentName])
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    va?: (...args: any[]) => void
  }
}
