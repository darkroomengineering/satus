'use client'

import { useDeviceDetection } from 'hooks/use-device-detection'
import dynamic from 'next/dynamic'
import { createContext, useContext, useEffect, useState } from 'react'
import tunnel from 'tunnel-rat'
import { create } from 'zustand'

const WebGLCanvas = dynamic(
  () => import('./webgl').then(({ WebGLCanvas }) => WebGLCanvas),
  {
    ssr: false,
  },
)

const useRoot = create(() => ({}))

export const CanvasContext = createContext({})

export function Canvas({ children, root = false }) {
  const [WebGLTunnel] = useState(() => new tunnel())
  const [DOMTunnel] = useState(() => new tunnel())
  const [state, setState] = useState()

  const { isWebGL } = useDeviceDetection()

  useEffect(() => {
    if (root) {
      useRoot.setState({ WebGLTunnel, DOMTunnel, ...state })
    }

    return () => {
      useRoot.setState({})
    }
  }, [root, WebGLTunnel, DOMTunnel, state])

  return (
    <CanvasContext.Provider value={{ WebGLTunnel, DOMTunnel, ...state }}>
      {isWebGL && (
        <WebGLCanvas
          onChange={(state) => {
            if (root) setState(state)
          }}
        />
      )}
      {children}
    </CanvasContext.Provider>
  )
}

export function useCanvas() {
  const local = useContext(CanvasContext)
  const root = useRoot()

  const isLocalDefined = Object.keys(local).length > 0

  return isLocalDefined ? local : root
}
