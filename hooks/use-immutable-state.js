import { useState } from 'react'

export function useImmutableState(initialState) {
  const [state] = useState(
    typeof initialState === 'function' ? initialState() : initialState
  )

  return state
}
