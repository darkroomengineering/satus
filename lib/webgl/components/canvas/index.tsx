'use client'

import dynamic from 'next/dynamic'
import { createContext, type PropsWithChildren, use } from 'react'
import type tunnel from 'tunnel-rat'
import { useDeviceDetection } from '@/lib/hooks/use-device-detection'
import { getDOMTunnel, getWebGLTunnel } from '@/lib/webgl/store'

const WebGLCanvas = dynamic(
  () => import('./webgl').then(({ WebGLCanvas }) => WebGLCanvas),
  {
    ssr: false,
  }
)

type TunnelInstance = ReturnType<typeof tunnel>

type CanvasContextValue =
  | { active: false }
  | { active: true; WebGLTunnel: TunnelInstance; DOMTunnel: TunnelInstance }

type CanvasProps = PropsWithChildren<{
  /**
   * Mount the WebGL canvas, backed by the shared store tunnels. Mount it once
   * — either in the shared layout (persists across routes) or per page via
   * `<Wrapper webgl>`. Without it, children fall back to whichever root canvas
   * is mounted, via {@link useCanvas}.
   */
  root?: boolean
  /** Force WebGL even on mobile/non-WebGL devices */
  force?: boolean
}>

export const CanvasContext = createContext<CanvasContextValue>({
  active: false,
})

/**
 * Canvas component that provides WebGL context and the tunnel system.
 *
 * `root` mounts the actual canvas; mount exactly one across the app (in the
 * layout for a persistent canvas, or per page via `<Wrapper webgl>`). A
 * non-root `<Canvas>` mounts nothing and just lets children reach the root
 * canvas through {@link useCanvas}.
 *
 * @example
 * ```tsx
 * // Shared canvas, mounted once in the root layout
 * <Canvas root />
 *
 * // Portal content from anywhere
 * <WebGLTunnel>
 *   <My3DScene />
 * </WebGLTunnel>
 * ```
 */
export function Canvas({
  children,
  root = false,
  force = false,
  ...props
}: CanvasProps) {
  const { isWebGL } = useDeviceDetection()

  // Only a root canvas mounts the WebGL surface; it uses the shared store
  // tunnels so content portals into it from anywhere. A non-root <Canvas> is a
  // passthrough whose children fall back to the root canvas via useCanvas().
  const WebGLTunnel = root ? getWebGLTunnel() : undefined
  const DOMTunnel = root ? getDOMTunnel() : undefined

  const shouldRender = root && (isWebGL || force)
  const contextValue: CanvasContextValue =
    WebGLTunnel && DOMTunnel
      ? { active: true, WebGLTunnel, DOMTunnel }
      : { active: false }

  return (
    <CanvasContext.Provider value={contextValue}>
      {contextValue.active && shouldRender && <WebGLCanvas {...props} />}
      {children}
    </CanvasContext.Provider>
  )
}

/**
 * Hook to access the Canvas context (tunnels for WebGL and DOM content).
 */
export function useCanvas() {
  const localContext = use(CanvasContext)
  if (localContext.active) return localContext
  // Fall back to the root singletons — always present once the store is loaded.
  return {
    active: true as const,
    WebGLTunnel: getWebGLTunnel(),
    DOMTunnel: getDOMTunnel(),
  }
}
