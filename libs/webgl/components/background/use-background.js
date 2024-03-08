'use client'

import { useContext } from 'react'
import { BackgroundContext } from './context'

export function useBackground() {
  return useContext(BackgroundContext)
}
