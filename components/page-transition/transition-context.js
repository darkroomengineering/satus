'use client'

import { useBrowserNativeTransitions } from 'hooks/use-browser-native-transitions'
import { createContext, useContext, useEffect, useState } from 'react'

const TransitionContext = createContext()

export function useSetFinishViewTransition() {
  const { setFinishViewTransition } = useContext(TransitionContext)
  return setFinishViewTransition
}

export function TransitionProvider({ children }) {
  const [finishViewTransition, setFinishViewTransition] = useState(null)

  useEffect(() => {
    if (finishViewTransition) {
      finishViewTransition()
      setFinishViewTransition(null)
    }
  }, [finishViewTransition])

  useBrowserNativeTransitions()

  return (
    <TransitionContext.Provider value={{ setFinishViewTransition }}>
      {children}
    </TransitionContext.Provider>
  )
}
