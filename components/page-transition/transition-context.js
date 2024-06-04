'use client'

import { createContext, useContext, useState } from 'react'

const TransitionContext = createContext()

export function useSetFinishViewTransition() {
  const { setFinishViewTransition } = useContext(TransitionContext)
  return setFinishViewTransition
}

export function TransitionProvider({ children }) {
  // eslint-disable-next-line
  const [finishViewTransition, setFinishViewTransition] = useState(null)

  return (
    <TransitionContext.Provider value={{ setFinishViewTransition }}>
      {children}
    </TransitionContext.Provider>
  )
}
