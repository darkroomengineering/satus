'use client'

import { Select as BaseSelect } from '@base-ui/react/select'
import cn from 'clsx'
import type { ComponentProps } from 'react'
import s from './select.module.css'

/**
 * Select component built on Base UI for accessible dropdown selection.
 *
 * Supports both controlled and uncontrolled modes with full keyboard navigation.
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

// Types
type Option<T = string> = {
  value: T
  label: string
  disabled?: boolean
}

type SelectProps<T = string> = {
  /** CSS class for the trigger element */
  className?: string
  /** Label displayed above the select */
  label?: string
  /** Options to display in the dropdown */
  options?: Option<T>[]
  /** Placeholder text when no value is selected */
  placeholder?: string
  /** Custom icon for the trigger */
  icon?: React.ReactNode
  /** Controlled value */
  value?: T
  /** Default value (uncontrolled) */
  defaultValue?: T
  /** Callback when value changes */
  onValueChange?: (value: T) => void
  /** Whether the select is disabled */
  disabled?: boolean
  /** Name attribute for form submission */
  name?: string
  /** Whether a value is required */
  required?: boolean
}

function Select<T extends string = string>({
  className,
  label,
  options = [],
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
        if (val !== null && onValueChange) {
          onValueChange(val as T)
        }
      }}
      {...(disabled !== undefined && { disabled })}
      {...(name && { name })}
      {...(required !== undefined && { required })}
    >
      {label && (
        <span className={s.label}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </span>
      )}
      <BaseSelect.Trigger
        className={cn(
          'flex h-10 min-w-36 select-none items-center justify-between gap-3 rounded-md border pr-3 pl-3.5',
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
          <BaseSelect.Popup {...(s.popup && { className: s.popup })}>
            {options.map(({ value, label, disabled }) => (
              <BaseSelect.Item
                className={cn(
                  'grid select-none items-center gap-2 py-2 pr-4 pl-2.5 outline-none',
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

// Default chevron icon
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

// Compound component exports for advanced usage
const Root = BaseSelect.Root
const Trigger = ({
  className,
  ...props
}: ComponentProps<typeof BaseSelect.Trigger>) => (
  <BaseSelect.Trigger className={cn(s.trigger, className)} {...props} />
)
const Value = BaseSelect.Value
const Icon = BaseSelect.Icon
const Portal = BaseSelect.Portal
const Positioner = BaseSelect.Positioner
const Popup = ({
  className,
  ...props
}: ComponentProps<typeof BaseSelect.Popup>) => (
  <BaseSelect.Popup className={cn(s.popup, className)} {...props} />
)
const Item = ({
  className,
  ...props
}: ComponentProps<typeof BaseSelect.Item>) => (
  <BaseSelect.Item className={cn(s.option, className)} {...props} />
)
const ItemIndicator = BaseSelect.ItemIndicator
const ItemText = BaseSelect.ItemText
const Group = BaseSelect.Group
const GroupLabel = BaseSelect.GroupLabel
const Separator = BaseSelect.Separator
const Arrow = BaseSelect.Arrow

// Attach compound components to Select
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

// Also export compound components individually
export {
  Arrow as SelectArrow,
  Group as SelectGroup,
  GroupLabel as SelectGroupLabel,
  Icon as SelectIcon,
  Item as SelectItem,
  ItemIndicator as SelectItemIndicator,
  ItemText as SelectItemText,
  Popup as SelectPopup,
  Portal as SelectPortal,
  Positioner as SelectPositioner,
  Root as SelectRoot,
  Separator as SelectSeparator,
  Trigger as SelectTrigger,
  Value as SelectValue,
}
