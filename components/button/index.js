import { useRef } from 'react'
import { useButton } from 'react-aria'

export function Button(props) {
  let ref = useRef(null)
  let { buttonProps } = useButton(props, ref)
  const { children, className } = props

  return (
    <button {...buttonProps} className={className} ref={ref}>
      {children}
    </button>
  )
}
