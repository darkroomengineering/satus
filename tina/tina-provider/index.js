'use client'

import { createContext, useContext } from 'react'
import { useTinaObjects } from 'tina/hooks/use-tina'

const TinaContext = createContext()

export const TinaProvider = ({ children, serverData, pageId }) => {
  const { hero, global, sections } = useTinaObjects(serverData, pageId)

  return (
    <TinaContext.Provider value={{ hero, global, sections }}>
      {children}
    </TinaContext.Provider>
  )
}

export const useTinaContext = () => {
  return useContext(TinaContext)
}
