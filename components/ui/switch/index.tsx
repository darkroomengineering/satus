'use client'

import { Switch as BaseSwitch } from '@base-ui/react/switch'
import cn from 'clsx'
import type { ComponentProps } from 'react'
import s from './switch.module.css'

/**
 * Switch component built on Base UI for accessible toggle switches.
 *
 * @example
 * ```tsx
 * <Switch label="Enable notifications" />
 * ```
 *
 * @example
 * ```tsx
 * // Controlled
 * const [enabled, setEnabled] = useState(false)
 *
 * <Switch
 *   checked={enabled}
 *   onCheckedChange={setEnabled}
 *   label="Dark mode"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Compound pattern
 * <Switch.Root checked={on} onCheckedChange={setOn}>
 *   <Switch.Thumb />
 * </Switch.Root>
 * ```
 */

type SwitchProps = Omit<ComponentProps<typeof BaseSwitch.Root>, 'children'> & {
  /** Label for the switch */
  label?: string
  /** Additional class for the switch */
  className?: string
  /** Additional class for the label */
  labelClassName?: string
}

function Switch({ label, className, labelClassName, ...props }: SwitchProps) {
  const switchElement = (
    <BaseSwitch.Root
      {...(cn(s.root, className) && { className: cn(s.root, className) })}
      {...props}
    >
      <BaseSwitch.Thumb {...(s.thumb && { className: s.thumb })} />
    </BaseSwitch.Root>
  )

  if (!label) {
    return switchElement
  }

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Base UI switch is wrapped in label for accessibility
    <label className={cn(s.container, labelClassName)}>
      {switchElement}
      <span className={s.label}>{label}</span>
    </label>
  )
}

// Compound components
const Root = ({
  className,
  ...props
}: ComponentProps<typeof BaseSwitch.Root>) => (
  <BaseSwitch.Root className={cn(s.root, className)} {...props} />
)

const Thumb = ({
  className,
  ...props
}: ComponentProps<typeof BaseSwitch.Thumb>) => (
  <BaseSwitch.Thumb className={cn(s.thumb, className)} {...props} />
)

Switch.Root = Root
Switch.Thumb = Thumb

export { Switch }
