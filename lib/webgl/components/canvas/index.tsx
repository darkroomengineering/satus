'use client'

import dynamic from 'next/dynamic'
import { createContext, type PropsWithChildren, use } from 'react'
import tunnel from 'tunnel-rat'
import { useDeviceDetection } from '@/lib/hooks/use-device-detection'
import { useWebGLStore } from '@/lib/webgl/store'

const WebGLCanvas = dynamic(
  () => import('./webgl').then(({ WebGLCanvas }) => WebGLCanvas),
  {
    ssr: false,
  }
)

type CanvasContextValue = {
  WebGLTunnel?: ReturnType<typeof tunnel>
  DOMTunnel?: ReturnType<typeof tunnel>
}

type CanvasProps = PropsWithChildren<{
  /**
   * Whether to render the WebGL canvas. Activates the global canvas.
   */
  root?: boolean
  /** Force WebGL even on mobile/non-WebGL devices */
  force?: boolean
}>

export const CanvasContext = createContext<CanvasContextValue>({})

/**
 * Canvas component that provides WebGL context and tunnel system.
 *
 * Uses the GlobalCanvas for persistent context across routes (must be mounted
 * in your root layout).
 *
 * @example
 * ```tsx
 * <Canvas root>
 *   <WebGLTunnel>
 *     <My3DScene />
 *   </WebGLTunnel>
 *   <section>HTML content</section>
 * </Canvas>
 * ```
 */
export function Canvas({
  children,
  root = false,
  force = false,
  ...props
}: CanvasProps) {
  const { isWebGL } = useDeviceDetection()
  const shouldRender = isWebGL || force

  // Global store for GlobalCanvas mode
  const { getWebGLTunnel, getDOMTunnel } = useWebGLStore()

  const WebGLTunnel = root ? getWebGLTunnel() : tunnel()
  const DOMTunnel = root ? getDOMTunnel() : tunnel()

  // Build context value - provide tunnels when ready and should render
  const contextValue: CanvasContextValue =
    WebGLTunnel && DOMTunnel ? { WebGLTunnel, DOMTunnel } : {}

  return (
    <CanvasContext.Provider value={contextValue}>
      {WebGLTunnel && DOMTunnel && shouldRender && <WebGLCanvas {...props} />}
      {children}
    </CanvasContext.Provider>
  )
}

function useCanvasRoot() {
  const { getWebGLTunnel, getDOMTunnel } = useWebGLStore()
  return {
    WebGLTunnel: getWebGLTunnel(),
    DOMTunnel: getDOMTunnel(),
  }
}

/**
 * Hook to access the Canvas context (tunnels for WebGL and DOM content).
 */
export function useCanvas() {
  const localContext = use(CanvasContext)
  const rootContext = useCanvasRoot()

  return localContext?.WebGLTunnel && localContext?.DOMTunnel
    ? localContext
    : rootContext
}
