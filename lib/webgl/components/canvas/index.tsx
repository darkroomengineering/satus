'use client'

import dynamic from 'next/dynamic'
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useLayoutEffect,
  useState,
} from 'react'
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
   * Whether to render the WebGL canvas.
   * - When using GlobalCanvas (recommended): this activates the global canvas
   * - When using legacy local mode: this mounts a local canvas
   */
  root?: boolean
  /** Force WebGL even on mobile/non-WebGL devices */
  force?: boolean
  /**
   * Use legacy local canvas mode instead of GlobalCanvas.
   * Set to true to create a local canvas that unmounts on navigation.
   * Default: false (uses GlobalCanvas)
   */
  local?: boolean
}>

export const CanvasContext = createContext<CanvasContextValue>({})

/**
 * Canvas component that provides WebGL context and tunnel system.
 *
 * By default, uses the GlobalCanvas for persistent context across routes.
 * Set `local={true}` for legacy behavior (local canvas per page).
 *
 * @example
 * ```tsx
 * // Using GlobalCanvas (recommended)
 * // The GlobalCanvas must be mounted in your root layout
 * <Canvas root>
 *   <WebGLTunnel>
 *     <My3DScene />
 *   </WebGLTunnel>
 *   <section>HTML content</section>
 * </Canvas>
 * ```
 *
 * @example
 * ```tsx
 * // Legacy local mode (creates canvas per page)
 * <Canvas root local>
 *   <WebGLTunnel>
 *     <My3DScene />
 *   </WebGLTunnel>
 * </Canvas>
 * ```
 */
export function Canvas({
  children,
  root = false,
  force = false,
  local = false,
  ...props
}: CanvasProps) {
  const { isWebGL } = useDeviceDetection()
  const shouldRender = root && (isWebGL || force)

  // Global store for GlobalCanvas mode
  const { activate, setActive, getWebGLTunnel, getDOMTunnel } = useWebGLStore()

  // Local tunnels for legacy mode
  const [localWebGLTunnel] = useState(() => (local ? tunnel() : null))
  const [localDOMTunnel] = useState(() => (local ? tunnel() : null))

  // Get global tunnels (lazy singletons - safe to call during render)
  // These are module-level singletons, not React state, so no re-render loop
  const globalWebGLTunnel = !local && shouldRender ? getWebGLTunnel() : null
  const globalDOMTunnel = !local && shouldRender ? getDOMTunnel() : null

  // Handle activation and isActive state changes in effect
  useLayoutEffect(() => {
    if (!local && shouldRender) {
      activate()
      setActive(true)
      return () => setActive(false)
    }
    return undefined
  }, [local, shouldRender, activate, setActive])

  // Determine which tunnels to use
  const WebGLTunnel = local ? localWebGLTunnel : globalWebGLTunnel
  const DOMTunnel = local ? localDOMTunnel : globalDOMTunnel

  // For global mode, tunnels are always available (lazy singletons)
  const tunnelsReady = local
    ? localWebGLTunnel && localDOMTunnel
    : globalWebGLTunnel && globalDOMTunnel

  // Build context value - provide tunnels when ready and should render
  const contextValue: CanvasContextValue =
    shouldRender && tunnelsReady && WebGLTunnel && DOMTunnel
      ? { WebGLTunnel, DOMTunnel }
      : {}

  return (
    <CanvasContext.Provider value={contextValue}>
      {/* Only render local WebGLCanvas when in local mode */}
      {local && shouldRender && localWebGLTunnel && localDOMTunnel && (
        <WebGLCanvas {...props} />
      )}
      {children}
    </CanvasContext.Provider>
  )
}

/**
 * Hook to access the Canvas context (tunnels for WebGL and DOM content).
 */
export function useCanvas() {
  return useContext(CanvasContext) as Required<CanvasContextValue>
}
