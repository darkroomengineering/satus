import { type ButtonHTMLAttributes, useRef } from 'react'
import { type AriaButtonOptions, useButton } from 'react-aria'

export function Button({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & AriaButtonOptions<'button'>) {
  const ref = useRef<HTMLButtonElement>(null!)
  const { buttonProps } = useButton(props, ref)

  return (
    <button {...buttonProps} className={className} ref={ref}>
      {children}
    </button>
  )
}
