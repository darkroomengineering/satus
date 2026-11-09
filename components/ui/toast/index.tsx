'use client'

import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useReducer,
} from 'react'

import type { ToastHost as LoadedToastHost } from './toast'

/**
 * Toasts on Base UI. `ToastProvider` is mounted app-wide in
 * `app/(site)/layout.tsx`; call `useToast()` from any client component.
 *
 * This module never imports Base UI, so pages that never show a toast don't
 * download it. `toast()` queues the message and, on the first call, imports
 * `ToastHost` (`./toast.tsx`) and mounts it once loaded; the host owns Base
 * UI's provider and viewport. Restyle or recompose toasts there.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { toast } = useToast()
 *
 *   return (
 *     <button type="button" onClick={() => toast('Item saved!')}>
 *       Save
 *     </button>
 *   )
 * }
 * ```
 */

export type ToastType = 'default' | 'success' | 'error' | 'info'

interface ToastOptions {
  type?: ToastType
}

export interface QueuedToast {
  title: string
  type: ToastType
}

interface ToastContextValue {
  toast: ((message: string, options?: ToastOptions) => void) & {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

// Outside the component: React Compiler cannot compile a component body that
// contains an `import()` expression and skips optimizing it entirely.
function loadToastHost() {
  return import('./toast')
}

// The host chunk's lifecycle. `queue` holds toasts the host has not consumed
// yet. A failed chunk load (offline, or a deploy replacing chunks) must not
// reach global-error, since an error toast is most likely exactly then:
// `failed` drops toasts and keeps the page.
type HostState =
  | { status: 'idle' }
  | { status: 'loading'; queue: QueuedToast[] }
  | {
      status: 'ready'
      Host: typeof LoadedToastHost
      queue: QueuedToast[]
    }
  | { status: 'failed' }

type HostAction =
  | { type: 'add'; toast: QueuedToast }
  | { type: 'loaded'; Host: typeof LoadedToastHost }
  | { type: 'loadFailed' }
  | { type: 'consumed'; count: number }

function hostReducer(state: HostState, action: HostAction): HostState {
  switch (action.type) {
    case 'add':
      if (state.status === 'failed') return state
      if (state.status === 'idle') {
        return { status: 'loading', queue: [action.toast] }
      }
      return { ...state, queue: [...state.queue, action.toast] }
    case 'loaded':
      if (state.status !== 'loading') return state
      return { status: 'ready', Host: action.Host, queue: state.queue }
    case 'loadFailed':
      if (state.status !== 'loading') return state
      return { status: 'failed' }
    case 'consumed':
      // Drop only what the host consumed: a toast queued between its effect
      // and this update must survive.
      if (state.status !== 'ready') return state
      return { ...state, queue: state.queue.slice(action.count) }
  }
}

export function useToast() {
  const context = use(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [host, dispatch] = useReducer(hostReducer, { status: 'idle' })
  const isLoading = host.status === 'loading'

  useEffect(() => {
    if (!isLoading) return
    let cancelled = false
    void loadToastHost().then(
      (mod) => {
        if (!cancelled) dispatch({ type: 'loaded', Host: mod.ToastHost })
      },
      () => {
        if (!cancelled) dispatch({ type: 'loadFailed' })
      }
    )
    return () => {
      cancelled = true
    }
  }, [isLoading])

  function add(title: string, type: ToastType) {
    dispatch({ type: 'add', toast: { title, type } })
  }

  const toast = Object.assign(
    (message: string, options?: ToastOptions) => {
      add(message, options?.type ?? 'default')
    },
    {
      success: (message: string) => add(message, 'success'),
      error: (message: string) => add(message, 'error'),
      info: (message: string) => add(message, 'info'),
    }
  )

  return (
    <ToastContext value={{ toast }}>
      {children}
      {host.status === 'ready' && (
        <host.Host
          pending={host.queue}
          onConsumed={(count) => dispatch({ type: 'consumed', count })}
        />
      )}
    </ToastContext>
  )
}
