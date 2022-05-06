import { useLayoutEffect } from '@studio-freight/hamo'
import { useState } from 'react'

export function _useDocumentReadyState() {
  const [readyState, setReadyState] = useState(document.readyState)

  useLayoutEffect(() => {
    setReadyState(document.readyState)

    function onStateChange() {
      setReadyState(document.readyState)
    }

    document.addEventListener('readystatechange', onStateChange, false)

    return () =>
      document.removeEventListener('readystatechange', onStateChange, false)
  }, [])

  return readyState
}

export const useDocumentReadyState =
  typeof window !== 'undefined' ? _useDocumentReadyState : () => undefined
