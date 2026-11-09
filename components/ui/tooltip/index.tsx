'use client'

import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'
import cn from 'clsx'
import { type ComponentProps, isValidElement, type ReactNode } from 'react'

import s from './tooltip.module.css'

/**
 * Tooltip on Base UI.
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
 *
 * @example
 * ```tsx
 * // One shared Provider: once one tooltip is open, the others open without the delay
 * <Tooltip.Provider>
 *   <Tooltip content="Bold"><button type="button">B</button></Tooltip>
 *   <Tooltip content="Italic"><button type="button">I</button></Tooltip>
 * </Tooltip.Provider>
 * ```
 */

type TooltipProps = {
  content: ReactNode
  /** The trigger: a single element that accepts a ref. */
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  /** Class for the popup. */
  className?: string
}

function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger
        render={isValidElement(children) ? children : <span>{children}</span>}
      />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={8}>
          <BaseTooltip.Popup className={cn(s.popup, className)}>
            <BaseTooltip.Arrow className={s.arrow} />
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}

const Provider = BaseTooltip.Provider
const Root = BaseTooltip.Root
const Trigger = BaseTooltip.Trigger
const Portal = BaseTooltip.Portal

function Positioner({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof BaseTooltip.Positioner>) {
  return (
    <BaseTooltip.Positioner
      className={className}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

function Popup({
  className,
  ...props
}: ComponentProps<typeof BaseTooltip.Popup>) {
  return <BaseTooltip.Popup className={cn(s.popup, className)} {...props} />
}

function Arrow({
  className,
  ...props
}: ComponentProps<typeof BaseTooltip.Arrow>) {
  return <BaseTooltip.Arrow className={cn(s.arrow, className)} {...props} />
}

Tooltip.Provider = Provider
Tooltip.Root = Root
Tooltip.Trigger = Trigger
Tooltip.Portal = Portal
Tooltip.Positioner = Positioner
Tooltip.Popup = Popup
Tooltip.Arrow = Arrow

export { Tooltip }
