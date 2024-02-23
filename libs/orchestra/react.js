import { useEffect, useRef, useState } from 'react'
import Orchestra from '.'

export function useOrchestra() {
  const [state, setState] = useState({})

  useEffect(() => {
    const usubscribe = Orchestra.subscribe(setState)

    return usubscribe
  }, [])

  return state
}

export function OrchestraToggle({ id, children, ...props }) {
  const elementRef = useRef()

  useEffect(() => {
    Orchestra.add(id, children)
    const toggle = Orchestra.toggles.find((toggle) => toggle.id === id)
    elementRef.current.appendChild(toggle.domElement)

    return () => {
      Orchestra.remove(id)
      toggle.domElement.remove()
    }
  }, [id, children])

  return <div ref={elementRef} {...props} />
}
