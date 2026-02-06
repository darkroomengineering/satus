'use client'

/**
 * @module tunnel
 *
 * Provides portal components for bridging React children across renderer
 * boundaries. React Three Fiber renders into its own React reconciler,
 * which means standard React contexts from the DOM tree are not available
 * inside the R3F canvas. This module uses `tunnel-rat` to teleport
 * JSX from the DOM tree into the WebGL scene graph (via {@link WebGLTunnel})
 * or into an HTML overlay layer on top of the canvas (via {@link DOMTunnel}).
 */

import { useContextBridge } from '@react-three/drei'
import { Fragment, type PropsWithChildren, useId } from 'react'
import { TransformContext } from '@/hooks/use-transform'
import { SheetContext, SheetProvider, useSheet } from '@/lib/dev/theatre'
import { useCanvas } from '@/webgl/components/canvas'

/**
 * Portals React children into the R3F Canvas scene graph.
 *
 * Because React Three Fiber uses a separate React reconciler, contexts
 * from the DOM tree (e.g. `TransformContext`, Theatre.js `SheetContext`)
 * are invisible inside the canvas. `useContextBridge` from `@react-three/drei`
 * re-provides those contexts so children rendered inside the canvas can
 * still consume them.
 *
 * `useId` is used as the `key` on the bridge wrapper so that when the
 * route changes, React treats it as an entirely new subtree and forces
 * a full remount. This prevents stale Three.js objects from leaking
 * across page navigations.
 *
 * @param props - Standard React `PropsWithChildren`.
 * @returns The children teleported into the WebGL tunnel, or `undefined`
 *   if the tunnel is not yet available (canvas not mounted).
 *
 * @example
 * ```tsx
 * // Inside a page component (DOM tree)
 * import { WebGLTunnel } from '@/webgl/components/tunnel'
 *
 * export default function HeroSection() {
 *   return (
 *     <WebGLTunnel>
 *       <mesh>
 *         <boxGeometry />
 *         <meshStandardMaterial color="hotpink" />
 *       </mesh>
 *     </WebGLTunnel>
 *   )
 * }
 * ```
 */
export function WebGLTunnel({ children }: PropsWithChildren) {
  const { WebGLTunnel } = useCanvas()

  const ContextBridge = useContextBridge(TransformContext, SheetContext)

  const sheet = useSheet()
  const uuid = useId()

  if (!WebGLTunnel) return

  return (
    <WebGLTunnel.In>
      <ContextBridge key={uuid}>
        <SheetProvider
          id={sheet?.address?.sheetId}
          instance={sheet?.address?.sheetInstanceId}
        >
          {children}
        </SheetProvider>
      </ContextBridge>
    </WebGLTunnel.In>
  )
}

/**
 * Portals HTML children into the canvas DOM overlay layer.
 *
 * While {@link WebGLTunnel} places children into the Three.js scene,
 * `DOMTunnel` places standard HTML/React DOM elements into an overlay
 * `<div>` that sits on top of the canvas. This is useful for labels,
 * tooltips, or any HTML content that should visually overlay the 3D scene
 * but remain in the DOM for accessibility and interaction.
 *
 * Like `WebGLTunnel`, a `useId`-based key forces a remount on route changes
 * to prevent stale DOM nodes from persisting across navigations.
 *
 * @param props - Standard React `PropsWithChildren`.
 * @returns The children teleported into the DOM overlay tunnel.
 *
 * @example
 * ```tsx
 * import { DOMTunnel } from '@/webgl/components/tunnel'
 *
 * export default function SceneLabel() {
 *   return (
 *     <DOMTunnel>
 *       <p className="scene-label">Interactive 3D Scene</p>
 *     </DOMTunnel>
 *   )
 * }
 * ```
 */
export function DOMTunnel({ children }: PropsWithChildren) {
  const { DOMTunnel } = useCanvas()

  const uuid = useId()

  return (
    <DOMTunnel.In>
      <Fragment key={uuid}>{children}</Fragment>
    </DOMTunnel.In>
  )
}
