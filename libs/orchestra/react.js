'use client'

import { useEffect, useRef, useState } from 'react'
import Orchestra from '.'

export function useOrchestra() {
  const [state, setState] = useState({})

  useEffect(() => {
    setState(Orchestra.state)
    Orchestra.subscribe((state) => {
      setState(state)
    })
  }, [])

  return state
}

export function OrchestraToggle({ id, children }) {
  if (Orchestra) Orchestra.isDebug = true

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

  return <span ref={elementRef} />
}
