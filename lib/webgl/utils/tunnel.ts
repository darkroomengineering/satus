'use client'

/**
 * Portal factory for bridging React children across renderer boundaries:
 * `ReactDOM.createPortal` needs both ends on one renderer, and R3F's `<Canvas>`
 * runs its own reconciler. `In` pushes its children into a shared store, `Out`
 * renders that list wherever it's mounted.
 *
 * Ported from tunnel-rat (MIT) — see THIRD-PARTY-NOTICES.md.
 */

import {
  createElement,
  Fragment,
  type ReactNode,
  useEffect,
  useLayoutEffect,
} from 'react'
import { create, type StoreApi } from 'zustand'

// Layout effect on the client (children must be registered before paint so
// `Out` never flashes empty), plain effect on the server (no SSR warning).
const useIsomorphicLayoutEffect =
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- SSR guard; literal typeof enables bundler dead-code elimination
  typeof window === 'undefined' ? useEffect : useLayoutEffect

interface TunnelState {
  current: ReactNode[]
  version: number
  set: StoreApi<TunnelState>['setState']
}

interface TunnelInProps {
  children: ReactNode
}

export interface Tunnel {
  /** Registers `children` into the tunnel while mounted; renders nothing itself. */
  In: (props: TunnelInProps) => null
  /** Renders every currently-registered `In` child, in registration order. */
  Out: () => ReactNode
  /** Calls `listener` whenever the registered children change; returns the unsubscribe. */
  subscribe: (listener: () => void) => () => void
}

/** Each call is a separate tunnel with its own store, so unrelated portals never share content. */
export function tunnel(): Tunnel {
  const useStore = create<TunnelState>((set) => ({
    current: [],
    version: 0,
    set,
  }))

  return {
    In: ({ children }) => {
      const set = useStore((state) => state.set)
      const version = useStore((state) => state.version)

      // Bumping the version on mount re-renders and re-inserts every
      // already-registered `In`, so render order matches mount order.
      useIsomorphicLayoutEffect(() => {
        set((state) => ({ version: state.version + 1 }))
      }, [])

      // Cleanup unregisters the exact same `children` reference.
      useIsomorphicLayoutEffect(() => {
        set(({ current }) => ({ current: [...current, children] }))
        return () =>
          set(({ current }) => ({
            current: current.filter((child) => child !== children),
          }))
      }, [children, version])

      return null
    },
    Out: () => {
      const current = useStore((state) => state.current)
      return createElement(Fragment, null, current)
    },
    subscribe: (listener) =>
      useStore.subscribe((state, previous) => {
        if (state.current !== previous.current) listener()
      }),
  }
}
