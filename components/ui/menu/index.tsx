'use client'

import { Menu as BaseMenu } from '@base-ui/react/menu'
import cn from 'clsx'
import type { ComponentProps, ReactNode } from 'react'
import s from './menu.module.css'

/**
 * Menu component built on Base UI for accessible dropdown menus.
 *
 * Replaces the legacy Dropdown component with better accessibility,
 * keyboard navigation, and positioning via Floating UI.
 *
 * @example
 * ```tsx
 * import { Menu } from '@/components/ui/menu'
 *
 * <Menu.Root>
 *   <Menu.Trigger>Options</Menu.Trigger>
 *   <Menu.Portal>
 *     <Menu.Positioner>
 *       <Menu.Popup>
 *         <Menu.Item onClick={() => console.log('Edit')}>Edit</Menu.Item>
 *         <Menu.Item onClick={() => console.log('Delete')}>Delete</Menu.Item>
 *       </Menu.Popup>
 *     </Menu.Positioner>
 *   </Menu.Portal>
 * </Menu.Root>
 * ```
 *
 * @example
 * ```tsx
 * // With arrow indicator
 * <Menu.Root>
 *   <Menu.Trigger>
 *     Select option
 *     <Menu.Arrow />
 *   </Menu.Trigger>
 *   <Menu.Portal>
 *     <Menu.Positioner sideOffset={4}>
 *       <Menu.Popup>
 *         <Menu.Item>Option 1</Menu.Item>
 *         <Menu.Separator />
 *         <Menu.Item>Option 2</Menu.Item>
 *       </Menu.Popup>
 *     </Menu.Positioner>
 *   </Menu.Portal>
 * </Menu.Root>
 * ```
 */

// Re-export Root directly
const Root = BaseMenu.Root

// Trigger with default styling
type TriggerProps = ComponentProps<typeof BaseMenu.Trigger> & {
  className?: string
}

function Trigger({ className, children, ...props }: TriggerProps) {
  return (
    <BaseMenu.Trigger className={cn(s.trigger, className)} {...props}>
      {children}
    </BaseMenu.Trigger>
  )
}

// Portal - just re-export
const Portal = BaseMenu.Portal

// Positioner with sensible defaults
type PositionerProps = ComponentProps<typeof BaseMenu.Positioner>

function Positioner({ sideOffset = 4, className, ...props }: PositionerProps) {
  return (
    <BaseMenu.Positioner
      sideOffset={sideOffset}
      {...(className && { className })}
      {...props}
    />
  )
}

// Popup with default styling
type PopupProps = ComponentProps<typeof BaseMenu.Popup> & {
  className?: string
}

function Popup({ className, ...props }: PopupProps) {
  return <BaseMenu.Popup className={cn(s.popup, className)} {...props} />
}

// Item with default styling
type ItemProps = ComponentProps<typeof BaseMenu.Item> & {
  className?: string
}

function Item({ className, ...props }: ItemProps) {
  return <BaseMenu.Item className={cn(s.item, className)} {...props} />
}

// Separator
type SeparatorProps = {
  className?: string
}

function Separator({ className }: SeparatorProps) {
  return <hr className={cn(s.separator, className)} />
}

// Arrow indicator (for trigger)
type ArrowProps = {
  className?: string
  children?: ReactNode
}

function Arrow({ className, children }: ArrowProps) {
  return (
    <span className={cn(s.arrow, className)} aria-hidden="true">
      {children ?? '▼'}
    </span>
  )
}

// Group for organizing items
const Group = BaseMenu.Group
const GroupLabel = BaseMenu.GroupLabel

// Radio items for single selection
const RadioGroup = BaseMenu.RadioGroup
const RadioItem = BaseMenu.RadioItem
const RadioItemIndicator = BaseMenu.RadioItemIndicator

// Checkbox items for multiple selection
const CheckboxItem = BaseMenu.CheckboxItem
const CheckboxItemIndicator = BaseMenu.CheckboxItemIndicator

// Submenu support
const SubmenuTrigger = BaseMenu.SubmenuTrigger

export {
  Arrow,
  CheckboxItem,
  CheckboxItemIndicator,
  Group,
  GroupLabel,
  Item,
  Popup,
  Portal,
  Positioner,
  RadioGroup,
  RadioItem,
  RadioItemIndicator,
  Root,
  Separator,
  SubmenuTrigger,
  Trigger,
}

// Also export as namespace for compound component pattern
export const Menu = {
  Root,
  Trigger,
  Portal,
  Positioner,
  Popup,
  Item,
  Separator,
  Arrow,
  Group,
  GroupLabel,
  RadioGroup,
  RadioItem,
  RadioItemIndicator,
  CheckboxItem,
  CheckboxItemIndicator,
  SubmenuTrigger,
}
