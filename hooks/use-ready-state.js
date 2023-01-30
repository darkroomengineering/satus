// useDocumentReadyState.js
// This code is a custom hook that returns the current document.readyState
// The useEffect hook is used to set the state of the document to 'complete' when the document is ready

import { useEffect, useState } from 'react'

export function useDocumentReadyState() {
  const [readyState, setReadyState] = useState(undefined)

  useEffect(() => {
    if (typeof document === 'undefined') return

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
