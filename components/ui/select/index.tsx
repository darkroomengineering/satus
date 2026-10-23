'use client'

import { Select as BaseSelect } from '@base-ui/react/select'
import cn from 'clsx'
import type { ComponentProps } from 'react'

import s from './select.module.css'

/**
 * Select on Base UI; controlled or uncontrolled.
 *
 * @example
 * ```tsx
 * // Uncontrolled with defaultValue
 * <Select
 *   options={[
 *     { value: 'apple', label: 'Apple' },
 *     { value: 'banana', label: 'Banana' },
 *   ]}
 *   defaultValue="apple"
 *   placeholder="Choose a fruit"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Controlled mode
 * const [fruit, setFruit] = useState('apple')
 *
 * <Select
 *   options={fruits}
 *   value={fruit}
 *   onValueChange={setFruit}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Compound component pattern
 * <Select.Root value={value} onValueChange={setValue}>
 *   <Select.Trigger>
 *     <Select.Value placeholder="Select..." />
 *     <Select.Icon />
 *   </Select.Trigger>
 *   <Select.Portal>
 *     <Select.Positioner>
 *       <Select.Popup>
 *         {options.map((opt) => (
 *           <Select.Item key={opt.value} value={opt.value}>
 *             <Select.ItemIndicator>✓</Select.ItemIndicator>
 *             <Select.ItemText>{opt.label}</Select.ItemText>
 *           </Select.Item>
 *         ))}
 *       </Select.Popup>
 *     </Select.Positioner>
 *   </Select.Portal>
 * </Select.Root>
 * ```
 */

type Option<T = string> = {
  value: T
  label: string
  disabled?: boolean
}

// Stable reference reused across renders so memoized children don't see a new
// array identity every render when `options` is omitted.
const EMPTY_OPTIONS: readonly never[] = []

type SelectProps<T = string> = {
  /** Class for the trigger. */
  className?: string
  label?: string
  options?: readonly Option<T>[]
  placeholder?: string
  icon?: React.ReactNode
  value?: T
  defaultValue?: T
  /** Also fires with `null` when the selection is cleared. */
  onValueChange?: (value: T | null) => void
  disabled?: boolean
  name?: string
  required?: boolean
}

function Select<T extends string = string>({
  className,
  label,
  options = EMPTY_OPTIONS,
  placeholder = 'Select an option',
  icon,
  value,
  defaultValue,
  onValueChange,
  disabled,
  name,
  required,
}: SelectProps<T>) {
  return (
    <BaseSelect.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={(val, _details) => {
        onValueChange?.(val)
      }}
      {...(disabled !== undefined && { disabled })}
      {...(name && { name })}
      {...(required !== undefined && { required })}
    >
      {label && (
        <BaseSelect.Label className={s.label}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </BaseSelect.Label>
      )}
      <BaseSelect.Trigger
        className={cn(
          'h-10 min-w-36 gap-3 rounded-md pr-3 pl-3.5 flex items-center justify-between border select-none',
          s.trigger,
          className
        )}
      >
        <BaseSelect.Value>
          {(state) => state?.value || placeholder}
        </BaseSelect.Value>
        <BaseSelect.Icon className="flex">
          {icon ?? <ChevronIcon />}
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="outline-none" sideOffset={8}>
          <BaseSelect.Popup className={s.popup}>
            {options.map(({ value, label, disabled }) => (
              <BaseSelect.Item
                className={cn(
                  'gap-2 py-2 pr-4 pl-2.5 grid items-center outline-none select-none',
                  s.option
                )}
                value={value}
                key={value}
                {...(disabled !== undefined && { disabled })}
              >
                <BaseSelect.ItemIndicator className="col-start-1">
                  ✓
                </BaseSelect.ItemIndicator>
                <BaseSelect.ItemText className="col-start-2">
                  {label}
                </BaseSelect.ItemText>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  )
}

function ChevronIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const Root = BaseSelect.Root

function Trigger({
  className,
  ...props
}: ComponentProps<typeof BaseSelect.Trigger>) {
  return <BaseSelect.Trigger className={cn(s.trigger, className)} {...props} />
}

const Value = BaseSelect.Value
const Icon = BaseSelect.Icon
const Portal = BaseSelect.Portal
const Positioner = BaseSelect.Positioner

function Popup({
  className,
  ...props
}: ComponentProps<typeof BaseSelect.Popup>) {
  return <BaseSelect.Popup className={cn(s.popup, className)} {...props} />
}

function Item({ className, ...props }: ComponentProps<typeof BaseSelect.Item>) {
  return <BaseSelect.Item className={cn(s.option, className)} {...props} />
}

const ItemIndicator = BaseSelect.ItemIndicator
const ItemText = BaseSelect.ItemText
const Group = BaseSelect.Group
const GroupLabel = BaseSelect.GroupLabel
const Separator = BaseSelect.Separator
const Arrow = BaseSelect.Arrow

Select.Root = Root
Select.Trigger = Trigger
Select.Value = Value
Select.Icon = Icon
Select.Portal = Portal
Select.Positioner = Positioner
Select.Popup = Popup
Select.Item = Item
Select.ItemIndicator = ItemIndicator
Select.ItemText = ItemText
Select.Group = Group
Select.GroupLabel = GroupLabel
Select.Separator = Separator
Select.Arrow = Arrow

export { Select }
