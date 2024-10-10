import { useCallback, useEffect, useRef } from 'react'

export function useLazyState<T>(
  initialValue: T,
  callback: (newValue: T, oldValue: T) => void
) {
  const stateRef = useRef<T>(initialValue)

  useEffect(() => {
    callback(initialValue, initialValue)
  }, [callback, initialValue])

  function set(value: T | ((prevValue: T) => T)) {
    if (typeof value === 'function') {
      const nextValue = (value as (prevValue: T) => T)(stateRef.current)
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

  return [get, set]
}
