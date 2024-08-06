import {
  Select as AriaSelect,
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  SelectValue,
} from 'react-aria-components'

export function Select({
  className,
  label,
  options = [{ value: '1', label: 'Option 1' }],
  icon,
}) {
  return (
    <AriaSelect className={className}>
      {label && <Label>{label}</Label>}
      <Button>
        <SelectValue />
        {icon ? icon : <span aria-hidden="true">▼</span>}
      </Button>
      <Popover>
        <ListBox>
          {options.map((props) => {
            const { value, label } = props

            return (
              <ListBoxItem key={value} {...props}>
                {label}
              </ListBoxItem>
            )
          })}
        </ListBox>
      </Popover>
    </AriaSelect>
  )
}
