'use client'

import { createContext } from 'react'
import type tunnel from 'tunnel-rat'

export type CanvasContextValue = {
  WebGLTunnel?: ReturnType<typeof tunnel>
  DOMTunnel?: ReturnType<typeof tunnel>
}

export const CanvasContext = createContext<CanvasContextValue>({})
