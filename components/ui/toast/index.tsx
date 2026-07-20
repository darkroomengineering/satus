'use client'

import { Toast as BaseToast } from '@base-ui/react/toast'
import cn from 'clsx'
import { type ComponentProps, createContext, type ReactNode, use } from 'react'
import s from './toast.module.css'

/**
 * Toast component built on Base UI for accessible notifications.
 *
 * `ToastProvider` and `ToastViewport` are mounted app-wide in
 * `app/layout.tsx` — call `useToast()` from any client component.
 *
 * `app/layout.tsx` is a Server Component, so it must import `ToastProvider`
 * / `ToastViewport` as direct named exports rather than through the `Toast`
 * compound object below — property access on a plain object exported from a
 * `'use client'` module (`Toast.Provider`) isn't given a client reference by
 * Next's RSC/Turbopack transform (only top-level export bindings are), so it
 * resolves to `undefined` across the server → client boundary. The `Toast.*`
 * compound object remains safe to use for `Toast.Root` / `Toast.Title` /
 * etc., since those are only ever consumed from within other client
 * components (e.g. inside `Viewport` here), never from a Server Component.
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

// Renders the toast list itself when given no children — Base UI's Viewport
// displays nothing without a toasts.map(<Toast.Root>) child.
function Viewport({ className, children, ...props }: ViewportProps) {
  const { toasts } = BaseToast.useToastManager()

  return (
    <BaseToast.Portal>
      <BaseToast.Viewport className={cn(s.viewport, className)} {...props}>
        {children ??
          toasts.map((toastObject) => (
            <Root key={toastObject.id} toast={toastObject}>
              <Title />
              <Description />
              <Close aria-label="Dismiss notification">&times;</Close>
            </Root>
          ))}
      </BaseToast.Viewport>
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

// Direct named exports for consumption from Server Components (see note above).
export { Provider as ToastProvider, Viewport as ToastViewport }
