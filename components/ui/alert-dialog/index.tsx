'use client'

import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog'
import cn from 'clsx'
import type { ComponentProps, ReactNode } from 'react'
import s from './alert-dialog.module.css'

/**
 * AlertDialog component built on Base UI for accessible confirmation dialogs.
 *
 * @example
 * ```tsx
 * <AlertDialog
 *   trigger={<button>Delete</button>}
 *   title="Delete item?"
 *   description="This action cannot be undone."
 *   confirmLabel="Delete"
 *   onConfirm={() => deleteItem()}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Controlled
 * const [open, setOpen] = useState(false)
 *
 * <AlertDialog.Root open={open} onOpenChange={setOpen}>
 *   <AlertDialog.Trigger>
 *     <button>Show Dialog</button>
 *   </AlertDialog.Trigger>
 *   <AlertDialog.Portal>
 *     <AlertDialog.Backdrop />
 *     <AlertDialog.Popup>
 *       <AlertDialog.Title>Are you sure?</AlertDialog.Title>
 *       <AlertDialog.Description>
 *         This will permanently delete the item.
 *       </AlertDialog.Description>
 *       <div className="flex gap-2">
 *         <AlertDialog.Close>Cancel</AlertDialog.Close>
 *         <button onClick={handleConfirm}>Confirm</button>
 *       </div>
 *     </AlertDialog.Popup>
 *   </AlertDialog.Portal>
 * </AlertDialog.Root>
 * ```
 */

type AlertDialogProps = {
  /** Trigger element */
  trigger: ReactNode
  /** Dialog title */
  title: string
  /** Dialog description */
  description?: string
  /** Confirm button label */
  confirmLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Callback when confirmed */
  onConfirm?: () => void
  /** Callback when cancelled */
  onCancel?: () => void
  /** Whether the action is destructive (styles confirm button) */
  destructive?: boolean
  /** Additional class for the popup */
  className?: string
}

function AlertDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
  className,
}: AlertDialogProps) {
  return (
    <BaseAlertDialog.Root>
      <BaseAlertDialog.Trigger
        render={(props) => {
          // Clone the trigger element with dialog trigger props
          if (
            typeof trigger === 'object' &&
            trigger !== null &&
            'type' in trigger
          ) {
            const triggerEl = trigger as React.ReactElement<
              Record<string, unknown>
            >
            return <triggerEl.type {...triggerEl.props} {...props} />
          }
          return <button {...props}>{trigger}</button>
        }}
      />
      <BaseAlertDialog.Portal>
        <BaseAlertDialog.Backdrop
          {...(s.backdrop && { className: s.backdrop })}
        />
        <BaseAlertDialog.Popup
          {...(cn(s.popup, className) && { className: cn(s.popup, className) })}
        >
          <BaseAlertDialog.Title {...(s.title && { className: s.title })}>
            {title}
          </BaseAlertDialog.Title>
          {description && (
            <BaseAlertDialog.Description
              {...(s.description && { className: s.description })}
            >
              {description}
            </BaseAlertDialog.Description>
          )}
          <div className={s.actions}>
            <BaseAlertDialog.Close
              {...(s.cancel && { className: s.cancel })}
              onClick={onCancel}
            >
              {cancelLabel}
            </BaseAlertDialog.Close>
            <BaseAlertDialog.Close
              className={cn(s.confirm, destructive && s.destructive)}
              onClick={onConfirm}
            >
              {confirmLabel}
            </BaseAlertDialog.Close>
          </div>
        </BaseAlertDialog.Popup>
      </BaseAlertDialog.Portal>
    </BaseAlertDialog.Root>
  )
}

// Compound components
const Root = BaseAlertDialog.Root
const Trigger = BaseAlertDialog.Trigger
const Portal = BaseAlertDialog.Portal

const Backdrop = ({
  className,
  ...props
}: ComponentProps<typeof BaseAlertDialog.Backdrop>) => (
  <BaseAlertDialog.Backdrop className={cn(s.backdrop, className)} {...props} />
)

const Popup = ({
  className,
  ...props
}: ComponentProps<typeof BaseAlertDialog.Popup>) => (
  <BaseAlertDialog.Popup className={cn(s.popup, className)} {...props} />
)

const Title = ({
  className,
  ...props
}: ComponentProps<typeof BaseAlertDialog.Title>) => (
  <BaseAlertDialog.Title className={cn(s.title, className)} {...props} />
)

const Description = ({
  className,
  ...props
}: ComponentProps<typeof BaseAlertDialog.Description>) => (
  <BaseAlertDialog.Description
    className={cn(s.description, className)}
    {...props}
  />
)

const Close = BaseAlertDialog.Close

AlertDialog.Root = Root
AlertDialog.Trigger = Trigger
AlertDialog.Portal = Portal
AlertDialog.Backdrop = Backdrop
AlertDialog.Popup = Popup
AlertDialog.Title = Title
AlertDialog.Description = Description
AlertDialog.Close = Close

export { AlertDialog }
