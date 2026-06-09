'use client'

import { createContext } from 'react'
import type { TunnelInstance } from '@/webgl/utils/tunnel'

export type CanvasContextValue = {
  WebGLTunnel?: TunnelInstance
  DOMTunnel?: TunnelInstance
}

export const CanvasContext = createContext<CanvasContextValue>({})
