'use client'

/**
 * @module tunnel
 *
 * Portal factory for bridging React children across renderer boundaries.
 * `ReactDOM.createPortal` only works when both ends share a renderer, which
 * breaks down for `<Canvas>` from `@react-three/fiber` — it runs its own
 * React reconciler, so DOM-tree content can't reach it that way. `tunnel()`
 * gets around that with a tiny external store: `In` pushes its children into
 * a shared list, `Out` renders that list wherever it's mounted, regardless of
 * which reconciler either side belongs to.
 *
 * Ported from tunnel-rat (MIT) — see THIRD-PARTY-NOTICES.md.
 */

import {
  Fragment,
  createElement,
  type ReactNode,
  useEffect,
  useLayoutEffect,
} from 'react'
import { create, type StoreApi } from 'zustand'

// Layout effect on the client (children must be registered before paint so
// `Out` never flashes empty), plain effect on the server (no-op, no SSR warning).
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
}

/**
 * Creates an independent `{ In, Out }` pair backed by its own store — each
 * call is a separate tunnel, so unrelated portals never share content.
 */
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

      // Bump the version on mount so every already-registered `In` re-renders
      // and re-inserts, making the final render order match mount order.
      useIsomorphicLayoutEffect(() => {
        set((state) => ({ version: state.version + 1 }))
      }, [])

      // Register `children` whenever it (or `version`) changes, and
      // unregister the exact same reference on cleanup/unmount.
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
  }
}
