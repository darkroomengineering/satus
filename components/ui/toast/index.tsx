'use client'

import { Toast as BaseToast } from '@base-ui/react/toast'
import cn from 'clsx'
import { type ComponentProps, createContext, type ReactNode, use } from 'react'
import s from './toast.module.css'

/**
 * Toast component built on Base UI for accessible notifications.
 *
 * @example
 * ```tsx
 * // Wrap your app with ToastProvider
 * <Toast.Provider>
 *   <App />
 *   <Toast.Viewport />
 * </Toast.Provider>
 * ```
 *
 * @example
 * ```tsx
 * // Use the toast hook
 * function MyComponent() {
 *   const { toast } = useToast()
 *
 *   return (
 *     <button onClick={() => toast('Item saved!')}>
 *       Save
 *     </button>
 *   )
 * }
 * ```
 */

type ToastType = 'default' | 'success' | 'error' | 'info'

type ToastOptions = {
  type?: ToastType
}

type ToastContextValue = {
  toast: ((message: string, options?: ToastOptions) => void) & {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = use(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a Toast.Provider')
  }
  return context
}

// Provider
function Provider({ children }: { children: ReactNode }) {
  return (
    <BaseToast.Provider>
      <ToastContextWrapper>{children}</ToastContextWrapper>
    </BaseToast.Provider>
  )
}

function ToastContextWrapper({ children }: { children: ReactNode }) {
  const toastManager = BaseToast.useToastManager()

  const toast = Object.assign(
    (message: string, options?: ToastOptions) => {
      toastManager.add({
        title: message,
        type: options?.type ?? 'default',
      })
    },
    {
      success: (message: string) => {
        toastManager.add({ title: message, type: 'success' })
      },
      error: (message: string) => {
        toastManager.add({ title: message, type: 'error' })
      },
      info: (message: string) => {
        toastManager.add({ title: message, type: 'info' })
      },
    }
  )

  return (
    <ToastContext.Provider value={{ toast }}>{children}</ToastContext.Provider>
  )
}

// Viewport (where toasts appear)
type ViewportProps = ComponentProps<typeof BaseToast.Viewport> & {
  className?: string
}

function Viewport({ className, ...props }: ViewportProps) {
  return (
    <BaseToast.Portal>
      <BaseToast.Viewport className={cn(s.viewport, className)} {...props} />
    </BaseToast.Portal>
  )
}

function Root({ className, ...props }: ComponentProps<typeof BaseToast.Root>) {
  return <BaseToast.Root className={cn(s.root, className)} {...props} />
}

function Title({
  className,
  ...props
}: ComponentProps<typeof BaseToast.Title>) {
  return <BaseToast.Title className={cn(s.title, className)} {...props} />
}

function Description({
  className,
  ...props
}: ComponentProps<typeof BaseToast.Description>) {
  return (
    <BaseToast.Description
      className={cn(s.description, className)}
      {...props}
    />
  )
}

function Close({
  className,
  ...props
}: ComponentProps<typeof BaseToast.Close>) {
  return <BaseToast.Close className={cn(s.close, className)} {...props} />
}

export const Toast = {
  Provider,
  Portal: BaseToast.Portal,
  Viewport,
  Root,
  Title,
  Description,
  Close,
}
