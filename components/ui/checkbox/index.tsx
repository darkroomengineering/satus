'use client'

import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox'
import cn from 'clsx'
import type { ComponentProps } from 'react'
import s from './checkbox.module.css'

/**
 * Checkbox component built on Base UI for accessible checkboxes.
 *
 * @example
 * ```tsx
 * <Checkbox label="Accept terms and conditions" />
 * ```
 *
 * @example
 * ```tsx
 * // Controlled
 * const [agreed, setAgreed] = useState(false)
 *
 * <Checkbox
 *   checked={agreed}
 *   onCheckedChange={setAgreed}
 *   label="I agree"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Indeterminate state
 * <Checkbox
 *   checked="indeterminate"
 *   label="Select all"
 * />
 * ```
 */

type CheckboxProps = Omit<
  ComponentProps<typeof BaseCheckbox.Root>,
  'children'
> & {
  /** Label for the checkbox */
  label?: string
  /** Additional class for the checkbox */
  className?: string
  /** Additional class for the label */
  labelClassName?: string
}

function Checkbox({
  label,
  className,
  labelClassName,
  ...props
}: CheckboxProps) {
  const checkboxElement = (
    <BaseCheckbox.Root
      {...(cn(s.root, className) && { className: cn(s.root, className) })}
      {...props}
    >
      <BaseCheckbox.Indicator {...(s.indicator && { className: s.indicator })}>
        <CheckIcon />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  )

  if (!label) {
    return checkboxElement
  }

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Base UI checkbox is wrapped in label for accessibility
    <label className={cn(s.container, labelClassName)}>
      {checkboxElement}
      <span className={s.label}>{label}</span>
    </label>
  )
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 6L5 8.5L9.5 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Compound components
const Root = ({
  className,
  ...props
}: ComponentProps<typeof BaseCheckbox.Root>) => (
  <BaseCheckbox.Root className={cn(s.root, className)} {...props} />
)

const Indicator = ({
  className,
  children,
  ...props
}: ComponentProps<typeof BaseCheckbox.Indicator>) => (
  <BaseCheckbox.Indicator className={cn(s.indicator, className)} {...props}>
    {children ?? <CheckIcon />}
  </BaseCheckbox.Indicator>
)

Checkbox.Root = Root
Checkbox.Indicator = Indicator

export { Checkbox }
