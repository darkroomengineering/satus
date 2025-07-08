import { Select } from '@base-ui-components/react/select'
import cn from 'clsx'
import s from './select.module.css'

type SelectProps = {
  className?: string
  label?: string
  options?: { value: string; label: string }[]
  placeholder?: string
  icon?: React.ReactNode
}

function CustomSelect({
  className,
  label,
  options,
  placeholder,
  icon,
}: SelectProps) {
  return (
    <Select.Root defaultValue="sans">
      {!!label && label}
      <Select.Trigger
        className={cn(
          'flex h-10 min-w-36 items-center justify-between gap-3 rounded-md border pr-3 pl-3.5 select-none',
          className
        )}
      >
        <Select.Value>{placeholder ?? 'Select an item'}</Select.Value>
        <Select.Icon className="flex">
          {icon ? icon : <span aria-hidden="true">▼</span>}
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          className="outline-none"
          sideOffset={8}
          alignItemWithTrigger={false}
        >
          <Select.Popup className="">
            {options?.map(({ value, label }) => (
              <Select.Item
                className={cn(
                  'grid items-center gap-2 py-2 pr-4 pl-2.5 outline-none select-none',
                  s.item
                )}
                value={value}
                key={value}
              >
                <Select.ItemIndicator className="col-start-1">
                  ✓
                </Select.ItemIndicator>
                <Select.ItemText className="col-start-2">
                  {label}
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}

export { CustomSelect as Select }
