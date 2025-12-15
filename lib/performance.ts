// Custom performance monitoring utilities to replace web-vitals

export interface PerformanceMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta?: number
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number
  hadRecentInput: boolean
}

interface FirstInputEntry extends PerformanceEntry {
  processingStart: number
}

interface PaintEntry extends PerformanceEntry {
  name: 'first-paint' | 'first-contentful-paint'
}

interface NavigationEntry extends PerformanceEntry {
  responseStart: number
  domContentLoadedEventEnd: number
  loadEventEnd: number
}

export function getCLS(onReport?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined') return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as LayoutShiftEntry
        if (layoutShiftEntry.hadRecentInput) continue // Skip if had recent input

        let rating: 'good' | 'needs-improvement' | 'poor' = 'good'
        if (layoutShiftEntry.value > 0.25) {
          rating = 'poor'
        } else if (layoutShiftEntry.value > 0.1) {
          rating = 'needs-improvement'
        }

        const metric = {
          name: 'CLS',
          value: layoutShiftEntry.value,
          rating,
        }
        onReport?.(metric)
      }
    })
    observer.observe({ entryTypes: ['layout-shift'] })
  } catch (error) {
    console.warn('CLS measurement not supported:', error)
  }
}

export function getFID(onReport?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined') return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const firstInputEntry = entry as FirstInputEntry
        const fidValue = firstInputEntry.processingStart - entry.startTime
        let rating: 'good' | 'needs-improvement' | 'poor' = 'good'
        if (fidValue > 300) {
          rating = 'poor'
        } else if (fidValue > 100) {
          rating = 'needs-improvement'
        }

        const metric = {
          name: 'FID',
          value: fidValue,
          rating,
        }
        onReport?.(metric)
      }
    })
    observer.observe({ entryTypes: ['first-input'] })
  } catch (error) {
    console.warn('FID measurement not supported:', error)
  }
}

export function getFCP(onReport?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined') return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const paintEntry = entry as PaintEntry
        if (paintEntry.name !== 'first-contentful-paint') continue

        let rating: 'good' | 'needs-improvement' | 'poor' = 'good'
        if (entry.startTime > 4000) {
          rating = 'poor'
        } else if (entry.startTime > 1800) {
          rating = 'needs-improvement'
        }

        const metric = {
          name: 'FCP',
          value: entry.startTime,
          rating,
        }
        onReport?.(metric)
      }
    })
    observer.observe({ entryTypes: ['paint'] })
  } catch (error) {
    console.warn('FCP measurement not supported:', error)
  }
}

export function getLCP(onReport?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined') return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        let rating: 'good' | 'needs-improvement' | 'poor' = 'good'
        if (entry.startTime > 4000) {
          rating = 'poor'
        } else if (entry.startTime > 2500) {
          rating = 'needs-improvement'
        }

        const metric = {
          name: 'LCP',
          value: entry.startTime,
          rating,
        }
        onReport?.(metric)
      }
    })
    observer.observe({ entryTypes: ['largest-contentful-paint'] })
  } catch (error) {
    console.warn('LCP measurement not supported:', error)
  }
}

export function getTTFB(onReport?: (metric: PerformanceMetric) => void): void {
  if (typeof window === 'undefined') return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const navigationEntry = entry as NavigationEntry
        let rating: 'good' | 'needs-improvement' | 'poor' = 'good'
        if (navigationEntry.responseStart > 800) {
          rating = 'poor'
        } else if (navigationEntry.responseStart > 400) {
          rating = 'needs-improvement'
        }

        const metric = {
          name: 'TTFB',
          value: navigationEntry.responseStart,
          rating,
        }
        onReport?.(metric)
      }
    })
    observer.observe({ entryTypes: ['navigation'] })
  } catch (error) {
    console.warn('TTFB measurement not supported:', error)
  }
}

// Report all web vitals
export function reportWebVitals(
  onReport?: (metric: PerformanceMetric) => void
): void {
  getCLS(onReport)
  getFID(onReport)
  getFCP(onReport)
  getLCP(onReport)
  getTTFB(onReport)
}
