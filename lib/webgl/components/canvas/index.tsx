'use client'

import { type PropsWithChildren, use, useLayoutEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useDeviceDetection } from '@/lib/hooks/use-device-detection'
import { useWebGLStore } from '@/lib/webgl/store'
import { CanvasContext, type CanvasContextValue } from './canvas-context'

// Re-export CanvasContext so existing import paths keep working
export { CanvasContext } from './canvas-context'

type CanvasProps = PropsWithChildren<{
  /**
   * Whether to render the WebGL canvas.
   * Activates the global canvas when set to true.
   */
  root?: boolean
  /** Force WebGL even on mobile/non-WebGL devices */
  force?: boolean
}>

/**
 * Canvas component that provides WebGL context and tunnel system.
 *
 * Uses the GlobalCanvas for persistent context across routes.
 * The GlobalCanvas must be mounted in your root layout.
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
 */
export function Canvas({ children, root = false, force = false }: CanvasProps) {
  const { hasGPU } = useDeviceDetection()
  const shouldRender = root && (hasGPU || force)

  // Global store for GlobalCanvas mode
  const { activate, setActive, getWebGLTunnel, getDOMTunnel } = useWebGLStore(
    useShallow((s) => ({
      activate: s.activate,
      setActive: s.setActive,
      getWebGLTunnel: s.getWebGLTunnel,
      getDOMTunnel: s.getDOMTunnel,
    }))
  )

  // Get global tunnels (lazy singletons - safe to call during render)
  // These are module-level singletons, not React state, so no re-render loop
  const globalWebGLTunnel = shouldRender ? getWebGLTunnel() : null
  const globalDOMTunnel = shouldRender ? getDOMTunnel() : null

  // Handle activation and isActive state changes in effect
  useLayoutEffect(() => {
    if (shouldRender) {
      activate()
      setActive(true)
      return () => setActive(false)
    }
    return undefined
  }, [shouldRender, activate, setActive])

  // Build context value - provide tunnels when ready and should render
  const contextValue: CanvasContextValue =
    shouldRender && globalWebGLTunnel && globalDOMTunnel
      ? { WebGLTunnel: globalWebGLTunnel, DOMTunnel: globalDOMTunnel }
      : {}

  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
    </CanvasContext.Provider>
  )
}

/**
 * Hook to access the Canvas context (tunnels for WebGL and DOM content).
 * Tunnels may be undefined when the Canvas is not yet activated.
 */
export function useCanvas() {
  return use(CanvasContext)
}
