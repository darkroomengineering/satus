import {
  type HTMLAttributes,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react'
import Orchestra from '.'

export function useOrchestra() {
  const [state, setState] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!Orchestra) return
    const usubscribe = Orchestra.subscribe(setState)

    return usubscribe
  }, [])

  return state
}

type OrchestraToggleProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'id' | 'children'
> & {
  children: string
  id: string
  buttonRef?: RefObject<HTMLButtonElement | null>
}

export function OrchestraToggle({
  id,
  children,
  buttonRef,
  ...props
}: OrchestraToggleProps) {
  const elementRef = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    if (!Orchestra) return
    Orchestra.add(id, children)
    const toggle = Orchestra.toggles.find((toggle) => toggle.id === id)
    toggle?.domElement && elementRef.current.appendChild(toggle.domElement)
    if (toggle?.domElement && buttonRef?.current) {
      buttonRef.current = toggle.domElement
    }

    return () => {
      Orchestra?.remove(id)
      toggle?.domElement.remove()
      if (buttonRef?.current) {
        buttonRef.current = null
      }
    }
  }, [id, children])

  return <div ref={elementRef} {...props} />
}
