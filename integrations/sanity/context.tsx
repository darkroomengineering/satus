'use client'

import { createContext, type PropsWithChildren, useContext } from 'react'

interface SanityContextValue {
  document: unknown
  isLoading?: boolean
  error?: Error | null
}

export const SanityContext = createContext<SanityContextValue | null>(null)

export function useSanityContext() {
  const context = useContext(SanityContext)
  if (!context) {
    throw new Error(
      'useSanityContext must be used within a SanityContextProvider'
    )
  }
  return context
}

type SanityContextProviderProps = {
  document: unknown
  isLoading?: boolean
  error?: Error | null
}

export function SanityContextProvider({
  document,
  isLoading = false,
  error = null,
  children,
}: PropsWithChildren<SanityContextProviderProps>) {
  return (
    <SanityContext.Provider value={{ document, isLoading, error }}>
      {children}
    </SanityContext.Provider>
  )
}
