'use client'

import { Menu as BaseMenu } from '@base-ui/react/menu'
import cn from 'clsx'
import type { ComponentProps, ReactNode } from 'react'

import s from './menu.module.css'

/**
 * Dropdown menu on Base UI (keyboard navigation, Floating UI positioning).
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

const Root = BaseMenu.Root

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

const Portal = BaseMenu.Portal

type PositionerProps = ComponentProps<typeof BaseMenu.Positioner>

function Positioner({ sideOffset = 4, className, ...props }: PositionerProps) {
  return (
    <BaseMenu.Positioner
      sideOffset={sideOffset}
      className={className}
      {...props}
    />
  )
}

type PopupProps = ComponentProps<typeof BaseMenu.Popup> & {
  className?: string
}

function Popup({ className, ...props }: PopupProps) {
  return <BaseMenu.Popup className={cn(s.popup, className)} {...props} />
}

type ItemProps = ComponentProps<typeof BaseMenu.Item> & {
  className?: string
}

function Item({ className, ...props }: ItemProps) {
  return <BaseMenu.Item className={cn(s.item, className)} {...props} />
}

type SeparatorProps = {
  className?: string
}

function Separator({ className }: SeparatorProps) {
  return <hr className={cn(s.separator, className)} />
}

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

const Group = BaseMenu.Group
const GroupLabel = BaseMenu.GroupLabel

const RadioGroup = BaseMenu.RadioGroup
const RadioItem = BaseMenu.RadioItem
const RadioItemIndicator = BaseMenu.RadioItemIndicator

const CheckboxItem = BaseMenu.CheckboxItem
const CheckboxItemIndicator = BaseMenu.CheckboxItemIndicator

const SubmenuTrigger = BaseMenu.SubmenuTrigger

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
