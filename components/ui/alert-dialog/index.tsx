'use client'

import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog'
import cn from 'clsx'
import {
  type ComponentProps,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'
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
  // When trigger is a ReactElement, pass it as the render prop so Base UI
  // merges its own trigger props (aria-*, data-*, onClick) correctly without
  // clobbering the element's existing handlers.
  return (
    <BaseAlertDialog.Root>
      <BaseAlertDialog.Trigger
        render={
          isValidElement(trigger) ? (
            (trigger as ReactElement)
          ) : (
            <button type="button">{trigger}</button>
          )
        }
      />
      <BaseAlertDialog.Portal>
        <BaseAlertDialog.Backdrop className={cn(s.backdrop)} />
        <BaseAlertDialog.Popup className={cn(s.popup, className)}>
          <BaseAlertDialog.Title className={cn(s.title)}>
            {title}
          </BaseAlertDialog.Title>
          {description && (
            <BaseAlertDialog.Description className={cn(s.description)}>
              {description}
            </BaseAlertDialog.Description>
          )}
          <div className={s.actions}>
            <BaseAlertDialog.Close className={cn(s.cancel)} onClick={onCancel}>
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
const Close = BaseAlertDialog.Close

function Backdrop({
  className,
  ...props
}: ComponentProps<typeof BaseAlertDialog.Backdrop>) {
  return (
    <BaseAlertDialog.Backdrop
      className={cn(s.backdrop, className)}
      {...props}
    />
  )
}

function Popup({
  className,
  ...props
}: ComponentProps<typeof BaseAlertDialog.Popup>) {
  return <BaseAlertDialog.Popup className={cn(s.popup, className)} {...props} />
}

function Title({
  className,
  ...props
}: ComponentProps<typeof BaseAlertDialog.Title>) {
  return <BaseAlertDialog.Title className={cn(s.title, className)} {...props} />
}

function Description({
  className,
  ...props
}: ComponentProps<typeof BaseAlertDialog.Description>) {
  return (
    <BaseAlertDialog.Description
      className={cn(s.description, className)}
      {...props}
    />
  )
}

AlertDialog.Root = Root
AlertDialog.Trigger = Trigger
AlertDialog.Portal = Portal
AlertDialog.Backdrop = Backdrop
AlertDialog.Popup = Popup
AlertDialog.Title = Title
AlertDialog.Description = Description
AlertDialog.Close = Close

export { AlertDialog }
