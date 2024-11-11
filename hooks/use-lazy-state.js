import { useCallback, useEffect, useRef } from 'react'

export function useLazyState(initialValue, callback, deps = []) {
  const stateRef = useRef(initialValue)

  useEffect(() => {
    callback(initialValue, initialValue)
  }, [initialValue])

  function set(value) {
    if (typeof value === 'function') {
      const nextValue = value(stateRef.current)
      callback(nextValue, stateRef.current)
      stateRef.current = nextValue
      return
    }

    if (value !== stateRef.current) {
      callback(value, stateRef.current)
      stateRef.current = value
    }
  }

  const get = useCallback(() => stateRef.current, [])

  useEffect(() => {
    callback(stateRef.current, stateRef.current)
  }, [...deps])

  return [get, set]
}
