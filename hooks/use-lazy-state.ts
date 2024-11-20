import { useCallback, useEffect, useRef } from 'react'

type SetStateAction<T> = T | ((prevState: T) => T)
type StateCallback<T> = (value: T, prevValue: T) => void

export function useLazyState<T>(
  initialValue: T,
  callback: StateCallback<T>,
  deps: unknown[] = []
) {
  const stateRef = useRef<T>(initialValue)

  // biome-ignore lint/correctness/useExhaustiveDependencies: we need to trigger on initialValue change
  useEffect(() => {
    callback(initialValue, initialValue)
  }, [initialValue])

  function set(value: SetStateAction<T>) {
    if (typeof value === 'function') {
      const nextValue = (value as (prevState: T) => T)(stateRef.current)
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: we need to trigger on deps change
  useEffect(() => {
    callback(stateRef.current, stateRef.current)
  }, [...deps])

  return [get, set] as const
}
