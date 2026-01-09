'use client'

import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import cn from 'clsx'
import {
  type ComponentProps,
  cloneElement,
  isValidElement,
  type ReactNode,
} from 'react'
import s from './tooltip.module.css'

/**
 * Tooltip component built on Base UI for accessible hover hints.
 *
 * @example
 * ```tsx
 * <Tooltip content="This is helpful information">
 *   <button>Hover me</button>
 * </Tooltip>
 * ```
 *
 * @example
 * ```tsx
 * // With custom placement
 * <Tooltip content="Settings" side="right">
 *   <IconButton icon={<SettingsIcon />} />
 * </Tooltip>
 * ```
 */

type TooltipProps = {
  /** Content to display in the tooltip */
  content: ReactNode
  /** The trigger element (must be a single element that accepts ref) */
  children: ReactNode
  /** Side of the trigger to place the tooltip */
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Additional class for the popup */
  className?: string
}

function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  return (
    <BaseTooltip.Provider>
      <BaseTooltip.Root>
        <BaseTooltip.Trigger
          render={(triggerProps) => {
            // If child is a valid element, clone it with trigger props
            if (isValidElement(children)) {
              return cloneElement(children, {
                ...triggerProps,
              } as Record<string, unknown>)
            }
            // Fallback to span wrapper
            return <span {...triggerProps}>{children}</span>
          }}
        />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner side={side} sideOffset={8}>
            <BaseTooltip.Popup
              {...(cn(s.popup, className) && {
                className: cn(s.popup, className),
              })}
            >
              <BaseTooltip.Arrow {...(s.arrow && { className: s.arrow })} />
              {content}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  )
}

// Compound components for advanced usage
const Provider = BaseTooltip.Provider
const Root = BaseTooltip.Root
const Trigger = BaseTooltip.Trigger
const Portal = BaseTooltip.Portal
const Positioner = ({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof BaseTooltip.Positioner>) => (
  <BaseTooltip.Positioner
    {...(className && { className })}
    sideOffset={sideOffset}
    {...props}
  />
)
const Popup = ({
  className,
  ...props
}: ComponentProps<typeof BaseTooltip.Popup>) => (
  <BaseTooltip.Popup className={cn(s.popup, className)} {...props} />
)
const Arrow = ({
  className,
  ...props
}: ComponentProps<typeof BaseTooltip.Arrow>) => (
  <BaseTooltip.Arrow className={cn(s.arrow, className)} {...props} />
)

// Attach compound components
Tooltip.Provider = Provider
Tooltip.Root = Root
Tooltip.Trigger = Trigger
Tooltip.Portal = Portal
Tooltip.Positioner = Positioner
Tooltip.Popup = Popup
Tooltip.Arrow = Arrow

export { Tooltip }
