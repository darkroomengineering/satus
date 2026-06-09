/**
 * Local tunnel utility.
 *
 * Creates a portal pair (`In` / `Out`) that lets React children be
 * rendered at a different point in the tree, bridging renderer
 * boundaries (e.g. DOM → R3F canvas).
 *
 * API is intentionally minimal: only the `In`/`Out` pair the repo uses.
 *
 * Implementation notes:
 * - `Out` returns a plain React fragment so it works in both DOM and
 *   R3F reconciler contexts (no wrapper elements).
 * - Uses `useSyncExternalStore` for concurrent-safe subscriptions.
 */

import {
  createElement,
  Fragment,
  type PropsWithChildren,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react'

type TunnelEntry = { id: number; children: ReactNode }

let _nextId = 0

/**
 * Creates a tunnel: a matched `In`/`Out` pair that portals React
 * children from the `In` mount site to the `Out` mount site.
 *
 * @example
 * ```tsx
 * const T = tunnel()
 *
 * // Somewhere in the DOM tree:
 * <T.In><MyMesh /></T.In>
 *
 * // Somewhere else (e.g. inside a Canvas):
 * <T.Out />
 * ```
 */
export function tunnel() {
  // Simple pub/sub store — avoids an extra zustand dependency.
  let entries: TunnelEntry[] = []
  const listeners = new Set<() => void>()

  function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function getSnapshot() {
    return entries
  }

  function notify() {
    for (const listener of listeners) listener()
  }

  function upsert(id: number, children: ReactNode) {
    const idx = entries.findIndex((e) => e.id === id)
    if (idx === -1) {
      entries = [...entries, { id, children }]
    } else {
      entries = entries.map((e) => (e.id === id ? { id, children } : e))
    }
    notify()
  }

  function remove(id: number) {
    entries = entries.filter((e) => e.id !== id)
    notify()
  }

  /**
   * Place children here; they will appear at the paired `Out` location.
   */
  function In({ children }: PropsWithChildren) {
    // Stable id — assigned once per mount.
    const idRef = useRef<number | null>(null)
    if (idRef.current === null) {
      idRef.current = _nextId++
    }
    const id = idRef.current

    // Keep the entry in sync with children on every render.
    useLayoutEffect(() => {
      upsert(id, children)
    })

    // Remove on unmount — id is stable for this mount's lifetime.
    // biome-ignore lint/correctness/useExhaustiveDependencies: id is stable (set once via ref); empty deps is intentional
    useLayoutEffect(() => {
      return () => remove(id)
    }, [])

    return null
  }

  /**
   * Renders whatever children have been registered via `In`.
   * Returns a plain fragment — compatible with both DOM and R3F reconciler.
   */
  function Out() {
    const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    return createElement(
      Fragment,
      null,
      ...current.map(({ id, children }) =>
        createElement(Fragment, { key: id }, children)
      )
    )
  }

  return { In, Out }
}

/** The type returned by `tunnel()`, used for TypeScript annotations. */
export type TunnelInstance = ReturnType<typeof tunnel>
