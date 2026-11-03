'use client'

import { Toast as BaseToast } from '@base-ui/react/toast'
import cn from 'clsx'
import { type ComponentProps, useEffect, useEffectEvent, useRef } from 'react'

import type { QueuedToast } from '.'

import s from './toast.module.css'

/**
 * Base UI side of the toasts, loaded by `ToastProvider` (`./index.tsx`) on the
 * first `toast()` call. Import from here only inside this lazy boundary: a
 * static import elsewhere puts Base UI's toast code back on every page.
 */
export function ToastHost({
  pending,
  onConsumed,
}: {
  pending: QueuedToast[]
  onConsumed: (count: number) => void
}) {
  return (
    <BaseToast.Provider>
      <QueueBridge pending={pending} onConsumed={onConsumed} />
      <Viewport />
    </BaseToast.Provider>
  )
}

function QueueBridge({
  pending,
  onConsumed,
}: {
  pending: QueuedToast[]
  onConsumed: (count: number) => void
}) {
  const toastManager = BaseToast.useToastManager()
  // Strict Mode replays effects: without this, each queued toast shows twice.
  const consumedRef = useRef<QueuedToast[] | null>(null)
  const consume = useEffectEvent((queue: QueuedToast[]) => {
    for (const { title, type } of queue) {
      toastManager.add({ title, type })
    }
    onConsumed(queue.length)
  })

  useEffect(() => {
    if (pending.length === 0 || consumedRef.current === pending) return
    consumedRef.current = pending
    consume(pending)
  }, [pending])

  return null
}

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
  Portal: BaseToast.Portal,
  Viewport,
  Root,
  Title,
  Description,
  Close,
}
