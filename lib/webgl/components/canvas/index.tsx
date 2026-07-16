'use client'

import dynamic from 'next/dynamic'
import {
  createContext,
  type PropsWithChildren,
  use,
  useEffect,
  useState,
} from 'react'
import type tunnel from 'tunnel-rat'
import { useDeviceDetection } from '@/lib/hooks/use-device-detection'
import {
  getDOMTunnel,
  getWebGLTunnel,
  registerRootCanvasMount,
} from '@/lib/webgl/store'

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
  /**
   * Which GPU simulations `FlowmapProvider` mounts (root canvas only).
   * Defaults to none (opt-in) — pass the sims you actually use, e.g.
   * `['flowmap']`, to avoid paying for a GPU pass and window listeners with
   * no consumer.
   */
  simTypes?: ('fluid' | 'flowmap')[]
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
  simTypes,
  ...props
}: CanvasProps) {
  const { isWebGL, isReducedMotion } = useDeviceDetection()

  // Only a root canvas mounts the WebGL surface; it uses the shared store
  // tunnels so content portals into it from anywhere. A non-root <Canvas> is a
  // passthrough whose children fall back to the root canvas via useCanvas().
  const WebGLTunnel = root ? getWebGLTunnel() : undefined
  const DOMTunnel = root ? getDOMTunnel() : undefined

  // `force` is an explicit escape hatch — it bypasses both the WebGL
  // capability check and the reduced-motion preference.
  const shouldRender = root && ((isWebGL && !isReducedMotion) || force)
  const contextValue: CanvasContextValue =
    WebGLTunnel && DOMTunnel
      ? { active: true, WebGLTunnel, DOMTunnel }
      : { active: false }

  // Assume primary optimistically so the single-instance (common) case never
  // flickers; corrected to `false` by the effect below when a second root
  // canvas is already registered. Registration only happens in an effect
  // (not during render) so React 19 StrictMode's double-invoke of
  // mount→cleanup→mount stays symmetric and never miscounts a single
  // instance as a duplicate.
  const [isPrimary, setIsPrimary] = useState(true)
  const isMounting = contextValue.active && shouldRender && isPrimary

  // Guard against two <Canvas root> instances both mounting the WebGL
  // surface at once (e.g. layout canvas + <Wrapper webgl> on the same page).
  // The second registrant gets `isPrimary: false` and renders nothing — this
  // is a real no-op in every environment, not just a dev-mode warning.
  useEffect(() => {
    if (!(contextValue.active && shouldRender)) return
    const registration = registerRootCanvasMount()
    setIsPrimary(registration.isPrimary)
    return registration.unregister
  }, [contextValue.active, shouldRender])

  return (
    <CanvasContext.Provider value={contextValue}>
      {isMounting && <WebGLCanvas {...props} {...(simTypes && { simTypes })} />}
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
