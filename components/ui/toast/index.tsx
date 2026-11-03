'use client'

import {
  createContext,
  lazy,
  type ReactNode,
  Suspense,
  use,
  useState,
} from 'react'

/**
 * Toasts on Base UI. `ToastProvider` is mounted app-wide in
 * `app/(site)/layout.tsx`; call `useToast()` from any client component.
 *
 * This module never imports Base UI, so pages that never show a toast don't
 * download it. `toast()` queues the message and, on the first call, mounts
 * `ToastHost` (`./toast.tsx`) behind `lazy()`; the host owns Base UI's
 * provider and viewport. Restyle or recompose toasts there.
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

const ToastHost = lazy(() =>
  import('./toast').then((mod) => ({ default: mod.ToastHost }))
)

export function useToast() {
  const context = use(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<QueuedToast[]>([])
  const [started, setStarted] = useState(false)

  function add(title: string, type: ToastType) {
    setStarted(true)
    setPending((queue) => [...queue, { title, type }])
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
      {started && (
        <Suspense fallback={null}>
          <ToastHost
            pending={pending}
            // Drop only what the host consumed: a toast queued between its
            // effect and this update must survive.
            onConsumed={(count) => setPending((queue) => queue.slice(count))}
          />
        </Suspense>
      )}
    </ToastContext>
  )
}
