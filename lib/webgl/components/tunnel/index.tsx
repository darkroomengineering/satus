'use client'

import { useContextBridge } from '@react-three/drei'
import { TransformContext } from 'hamo'
import { Fragment, type PropsWithChildren, useId } from 'react'

import { SheetContext } from '@/lib/dev/theatre'
import { useCanvas } from '@/webgl/components/canvas'

/**
 * Portals children into the R3F scene graph. R3F uses a separate reconciler,
 * so DOM-tree contexts (`TransformContext`, Theatre `SheetContext`) are
 * re-provided via drei's `useContextBridge`.
 *
 * The `useId` key remounts the subtree on route change, so stale Three.js
 * objects don't leak across navigations.
 */
export function WebGLTunnel({ children }: PropsWithChildren) {
  const { WebGLTunnel } = useCanvas()

  const ContextBridge = useContextBridge(TransformContext, SheetContext)
  const uuid = useId()

  if (!WebGLTunnel) return

  return (
    <WebGLTunnel.In>
      {/*
        `static-components` fires because ContextBridge comes out of a hook.
        It is safe: drei wraps the component in `useMemo(..., [])`
        (node_modules/@react-three/drei/core/useContextBridge.js), so it is
        created once per hook instance, with fresh context values read through
        a ref. The `key` keeps identity stable across re-parents.
      */}
      {/* oxlint-disable react/static-components -- drei memoizes the component once per hook instance */}
      {/* react-doctor-disable-next-line react-hooks-js/static-components */}
      <ContextBridge key={uuid}>{children}</ContextBridge>
      {/* oxlint-enable react/static-components */}
    </WebGLTunnel.In>
  )
}

/**
 * Portals HTML children into the DOM overlay layer on top of the canvas. The
 * `useId` key remounts on route change, like {@link WebGLTunnel}.
 */
export function DOMTunnel({ children }: PropsWithChildren) {
  const { DOMTunnel } = useCanvas()

  const uuid = useId()

  if (!DOMTunnel) return

  return (
    <DOMTunnel.In>
      <Fragment key={uuid}>{children}</Fragment>
    </DOMTunnel.In>
  )
}
