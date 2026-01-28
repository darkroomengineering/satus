'use client'

import { useSyncExternalStore } from 'react'

/**
 * Browser API Hooks using useSyncExternalStore
 *
 * These hooks provide performant, concurrent-rendering-safe subscriptions
 * to browser APIs. Components only re-render when their subscribed value changes.
 *
 * @see https://react.dev/reference/react/useSyncExternalStore
 */

// ============================================================================
// useMediaQuery
// ============================================================================

function subscribeToMediaQuery(query: string) {
  return (callback: () => void) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', callback)
    return () => mql.removeEventListener('change', callback)
  }
}

function getMediaQuerySnapshot(query: string) {
  return () => window.matchMedia(query).matches
}

function getMediaQueryServerSnapshot() {
  return false
}

/**
 * Subscribe to a CSS media query with automatic updates.
 *
 * Uses useSyncExternalStore for concurrent-rendering safety.
 * Only re-renders when the media query result changes.
 *
 * @param query - CSS media query string
 * @returns Whether the media query matches
 *
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const isDesktop = useMediaQuery('(min-width: 800px)')
 *   const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
 *
 *   return isDesktop ? <DesktopView /> : <MobileView />
 * }
 * ```
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeToMediaQuery(query),
    getMediaQuerySnapshot(query),
    getMediaQueryServerSnapshot
  )
}

// ============================================================================
// useOnlineStatus
// ============================================================================

function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getOnlineStatusSnapshot() {
  return navigator.onLine
}

function getOnlineStatusServerSnapshot() {
  return true
}

/**
 * Subscribe to browser online/offline status.
 *
 * Uses useSyncExternalStore for concurrent-rendering safety.
 * Only re-renders when online status changes.
 *
 * @returns Whether the browser is online
 *
 * @example
 * ```tsx
 * function NetworkStatus() {
 *   const isOnline = useOnlineStatus()
 *
 *   if (!isOnline) {
 *     return <OfflineBanner />
 *   }
 *
 *   return <App />
 * }
 * ```
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineStatusSnapshot,
    getOnlineStatusServerSnapshot
  )
}

// ============================================================================
// usePreferredColorScheme
// ============================================================================

const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)'

function subscribeToColorScheme(callback: () => void) {
  const mql = window.matchMedia(COLOR_SCHEME_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getColorSchemeSnapshot(): 'light' | 'dark' {
  return window.matchMedia(COLOR_SCHEME_QUERY).matches ? 'dark' : 'light'
}

function getColorSchemeServerSnapshot(): 'light' | 'dark' {
  return 'light'
}

/**
 * Subscribe to system color scheme preference.
 *
 * Uses useSyncExternalStore for concurrent-rendering safety.
 * Only re-renders when color scheme preference changes.
 *
 * @returns 'light' or 'dark' based on system preference
 *
 * @example
 * ```tsx
 * function ThemeProvider({ children }) {
 *   const colorScheme = usePreferredColorScheme()
 *
 *   return (
 *     <div data-theme={colorScheme}>
 *       {children}
 *     </div>
 *   )
 * }
 * ```
 */
export function usePreferredColorScheme(): 'light' | 'dark' {
  return useSyncExternalStore(
    subscribeToColorScheme,
    getColorSchemeSnapshot,
    getColorSchemeServerSnapshot
  )
}

// ============================================================================
// usePreferredReducedMotion
// ============================================================================

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeToReducedMotion(callback: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function getReducedMotionServerSnapshot(): boolean {
  return false
}

/**
 * Subscribe to user's reduced motion preference.
 *
 * Uses useSyncExternalStore for concurrent-rendering safety.
 * Only re-renders when reduced motion preference changes.
 *
 * @returns Whether the user prefers reduced motion
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const prefersReducedMotion = usePreferredReducedMotion()
 *
 *   const animationDuration = prefersReducedMotion ? 0 : 300
 *
 *   return (
 *     <motion.div
 *       animate={{ opacity: 1 }}
 *       transition={{ duration: animationDuration / 1000 }}
 *     />
 *   )
 * }
 * ```
 */
export function usePreferredReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  )
}

// ============================================================================
// useDocumentVisibility
// ============================================================================

function subscribeToVisibility(callback: () => void) {
  document.addEventListener('visibilitychange', callback)
  return () => document.removeEventListener('visibilitychange', callback)
}

function getVisibilitySnapshot(): DocumentVisibilityState {
  return document.visibilityState
}

function getVisibilityServerSnapshot(): DocumentVisibilityState {
  return 'visible'
}

/**
 * Subscribe to document visibility state.
 *
 * Uses useSyncExternalStore for concurrent-rendering safety.
 * Useful for pausing animations/videos when tab is hidden.
 *
 * @returns 'visible' or 'hidden'
 *
 * @example
 * ```tsx
 * function VideoPlayer() {
 *   const visibility = useDocumentVisibility()
 *   const videoRef = useRef<HTMLVideoElement>(null)
 *
 *   useEffect(() => {
 *     if (visibility === 'hidden') {
 *       videoRef.current?.pause()
 *     }
 *   }, [visibility])
 *
 *   return <video ref={videoRef} />
 * }
 * ```
 */
export function useDocumentVisibility(): DocumentVisibilityState {
  return useSyncExternalStore(
    subscribeToVisibility,
    getVisibilitySnapshot,
    getVisibilityServerSnapshot
  )
}
