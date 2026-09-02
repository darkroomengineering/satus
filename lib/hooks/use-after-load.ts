'use client'

import { type ReactNode, useSyncExternalStore } from 'react'

/**
 * True once the window has fully loaded: the mount gate for deferrable heavy
 * work. Booting a WebGL context and compiling its programs during hydration
 * bills main-thread time to the load for pixels the DOM is already painting
 * (measured on shield.fi mobile, 2026-08-12: 1,170 ms of Lighthouse total
 * blocking time, 190 ms after gating; performance score 71 to 93; LCP
 * unchanged). Nothing visible changes when the work is deferred, the effect
 * simply starts a beat after load.
 *
 * Reads `document.readyState` through `useSyncExternalStore`, so a component
 * mounting after load sees `true` on its first render (no extra commit) and
 * the server snapshot is `false` (nothing deferred ever renders in SSR HTML).
 *
 * @example
 * ```tsx
 * const afterLoad = useAfterLoad()
 * return afterLoad ? <HeavyThing /> : null
 * ```
 */
export function useAfterLoad(): boolean {
  return useSyncExternalStore(subscribeToLoad, getIsLoaded, getServerIsLoaded)
}

/**
 * The hook as a children gate, for server trees: a server component cannot
 * call the hook, and importing the gated module into a client wrapper drags
 * that module's whole graph into the client bundle. Children created by the
 * server pass through as references instead, so nothing new enters the
 * client graph and lazy internals fire only when the gate finally renders
 * them.
 *
 * @example
 * ```tsx
 * <AfterLoad>
 *   <SanityLive />
 * </AfterLoad>
 * ```
 */
export function AfterLoad({ children }: { children: ReactNode }) {
  return useAfterLoad() ? children : null
}

const NOOP_UNSUBSCRIBE = () => {
  // Nothing subscribed, nothing to tear down.
}

function subscribeToLoad(onChange: () => void) {
  if (document.readyState === 'complete') {
    // Already loaded: nothing will ever notify, and the snapshot is stable.
    return NOOP_UNSUBSCRIBE
  }
  window.addEventListener('load', onChange, { once: true })
  return () => window.removeEventListener('load', onChange)
}

function getIsLoaded() {
  return document.readyState === 'complete'
}

function getServerIsLoaded() {
  return false
}
