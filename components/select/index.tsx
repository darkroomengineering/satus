import cn from 'clsx'
import {
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
} from 'react-aria-components'
import s from './select.module.css'

type SelectProps = {
  className?: string
  label?: string
  options?: { value: string; label: string }[]
  placeholder?: string
  icon?: React.ReactNode
}

export function Select({
  className,
  label,
  options = [{ value: '1', label: 'Option 1' }],
  placeholder,
  icon,
}: SelectProps) {
  return (
    <AriaSelect className={cn(className, s.wrapper)} placeholder={placeholder}>
      {label && <Label>{label}</Label>}
      <Button className={s.button}>
        <AriaSelectValue className={s.value} />
        {icon ? icon : <span aria-hidden="true">▼</span>}
      </Button>
      <Popover className={s.popover}>
        <ListBox className={s.list}>
          {options.map(({ value, label }) => {
            return (
              <ListBoxItem
                key={value}
                value={{ value, label }}
                textValue={label}
                className={s.option}
              >
                {label}
              </ListBoxItem>
            )
          })}
        </ListBox>
      </Popover>
    </AriaSelect>
  )
}
