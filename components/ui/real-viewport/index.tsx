'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { mutate } from '@/utils/raf'

/**
 * Viewport values available for subscription
 */
export type ViewportValues = {
  vw: number
  dvh: number
  svh: number
  lvh: number
  scrollbarWidth: number
}

// ============================================================================
// Viewport Store (External Store Pattern)
// ============================================================================

let viewportState: ViewportValues = {
  vw: 0,
  dvh: 0,
  svh: 0,
  lvh: 0,
  scrollbarWidth: 0,
}

const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function getSnapshot(): ViewportValues {
  return viewportState
}

function getServerSnapshot(): ViewportValues {
  return {
    vw: 0,
    dvh: 0,
    svh: 0,
    lvh: 0,
    scrollbarWidth: 0,
  }
}

// ============================================================================
// Scrollbar Width Calculation
// ============================================================================

let cachedScrollbarWidth: number | null = null

function getScrollbarWidth(): number {
  if (cachedScrollbarWidth !== null) {
    return cachedScrollbarWidth
  }

  const outer = document.createElement('div')
  outer.style.visibility = 'hidden'
  outer.style.overflow = 'scroll'
  document.body.appendChild(outer)

  const inner = document.createElement('div')
  outer.appendChild(inner)

  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth
  outer.remove()

  cachedScrollbarWidth = scrollbarWidth
  return scrollbarWidth
}

// ============================================================================
// Viewport Update Logic
// ============================================================================

function updateViewport() {
  mutate(() => {
    const vw = document.documentElement.offsetWidth * 0.01
    const dvh = window.innerHeight * 0.01
    const svh = document.documentElement.clientHeight * 0.01
    const lvh = 1
    const scrollbarWidth = getScrollbarWidth()

    // Set CSS custom properties
    document.documentElement.style.setProperty(
      '--vw',
      `${Math.round(vw * 100) / 100}px`
    )
    document.documentElement.style.setProperty(
      '--dvh',
      `${Math.round(dvh * 100) / 100}px`
    )
    document.documentElement.style.setProperty(
      '--svh',
      `${Math.round(svh * 100) / 100}px`
    )
    document.documentElement.style.setProperty('--lvh', '1vh')
    document.documentElement.style.setProperty(
      '--scrollbar-width',
      `${Math.round(scrollbarWidth * 100) / 100}px`
    )

    // Only emit if values changed
    const newState: ViewportValues = { vw, dvh, svh, lvh, scrollbarWidth }

    if (
      viewportState.vw !== vw ||
      viewportState.dvh !== dvh ||
      viewportState.svh !== svh ||
      viewportState.scrollbarWidth !== scrollbarWidth
    ) {
      viewportState = newState
      emitChange()
    }
  })
}

// Debounce helper
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

const debouncedUpdateViewport = debounce(updateViewport, 100)

// ============================================================================
// Hooks
// ============================================================================

/**
 * Subscribe to viewport values with selector support.
 *
 * Uses useSyncExternalStore for concurrent-rendering safety.
 * Components only re-render when their selected value changes.
 *
 * @param selector - Optional selector to pick specific values
 * @returns Selected viewport value(s)
 *
 * @example
 * ```tsx
 * // Subscribe to all values (re-renders on any change)
 * const viewport = useViewport()
 *
 * // Subscribe to specific value (only re-renders when dvh changes)
 * const dvh = useViewport(state => state.dvh)
 *
 * // Subscribe to computed value
 * const isShortViewport = useViewport(state => state.dvh < 6)
 * ```
 */
export function useViewport(): ViewportValues
export function useViewport<T>(selector: (state: ViewportValues) => T): T
export function useViewport<T>(
  selector?: (state: ViewportValues) => T
): ViewportValues | T {
  // Cache selector and its result to prevent unnecessary re-renders
  const selectorRef = useRef(selector)
  const resultRef = useRef<T | ViewportValues | undefined>(undefined)
  const stateRef = useRef<ViewportValues | undefined>(undefined)

  // Update selector ref on each render (selector may be inline function)
  selectorRef.current = selector

  // Create a stable getSnapshot that integrates the selector
  // This ensures useSyncExternalStore only triggers re-renders
  // when the selected value actually changes
  const getSnapshotWithSelector = (): T | ViewportValues => {
    const nextState = getSnapshot()

    // If no selector, return full state
    if (!selectorRef.current) {
      return nextState
    }

    // If state hasn't changed, return cached result
    if (stateRef.current === nextState && resultRef.current !== undefined) {
      return resultRef.current
    }

    // Compute new result
    const nextResult = selectorRef.current(nextState)

    // If result is the same (by value for primitives), return cached
    if (Object.is(resultRef.current, nextResult)) {
      return resultRef.current as T
    }

    // Update cache and return new result
    stateRef.current = nextState
    resultRef.current = nextResult
    return nextResult
  }

  const getServerSnapshotWithSelector = (): T | ViewportValues => {
    const state = getServerSnapshot()
    return selectorRef.current ? selectorRef.current(state) : state
  }

  return useSyncExternalStore(
    subscribe,
    getSnapshotWithSelector,
    getServerSnapshotWithSelector
  )
}

/**
 * @deprecated Use `useViewport()` instead for better performance with selectors
 */
export function useRealViewport(): ViewportValues {
  return useViewport()
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Initializes viewport tracking and CSS custom properties.
 *
 * Place this component once at the root of your app.
 * It sets up resize listeners and CSS variables (--vw, --dvh, --svh, --lvh).
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { RealViewport } from '@/components/ui/real-viewport'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <RealViewport />
 *         {children}
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 *
 * Then in any component:
 * ```tsx
 * import { useViewport } from '@/components/ui/real-viewport'
 *
 * function MyComponent() {
 *   // Only re-renders when dvh changes
 *   const dvh = useViewport(state => state.dvh)
 *   return <div style={{ height: `${dvh * 100}px` }} />
 * }
 * ```
 */
export function RealViewport({ children }: { children?: React.ReactNode }) {
  useEffect(() => {
    // Set initial values
    updateViewport()

    // Subscribe to resize events
    window.addEventListener('resize', debouncedUpdateViewport, false)

    return () => {
      window.removeEventListener('resize', debouncedUpdateViewport, false)
    }
  }, [])

  return children ?? null
}
