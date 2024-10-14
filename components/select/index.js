import cn from 'clsx'
import {
  Select as AriaSelect,
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  SelectValue,
} from 'react-aria-components'
import s from './select.module.scss'

export function Select({
  className,
  label,
  options = [{ value: '1', label: 'Option 1' }],
  placeholder,
  icon,
}) {
  return (
    <AriaSelect className={cn(className, s.wrapper)}>
      {label && <Label>{label}</Label>}
      <Button className={s.button}>
        <SelectValue className={s.value} placeholder={placeholder} />
        {icon ? icon : <span aria-hidden="true">▼</span>}
      </Button>
      <Popover className={s.popover}>
        <ListBox className={s.list}>
          {options.map((props) => {
            const { value, label } = props
            return (
              <ListBoxItem key={value} {...props} className={s.option}>
                {label}
              </ListBoxItem>
            )
          })}
        </ListBox>
      </Popover>
    </AriaSelect>
  )
}
