'use client'

import { useContextBridge } from '@react-three/drei'
import { TransformContext } from 'hooks/use-transform'
import { useCanvas } from 'libs/webgl/components/canvas'
import { Fragment, useId } from 'react'

export function WebGLTunnel({ children }) {
  const { WebGLTunnel } = useCanvas()

  const ContextBridge = useContextBridge(TransformContext)

  const uuid = useId()

  if (!WebGLTunnel) return

  return (
    <WebGLTunnel.In>
      <ContextBridge key={uuid}>{children}</ContextBridge>
    </WebGLTunnel.In>
  )
}

export function DOMTunnel({ children }) {
  const { DOMTunnel } = useCanvas()

  const uuid = useId()

  return (
    <DOMTunnel.In>
      <Fragment key={uuid}>{children}</Fragment>
    </DOMTunnel.In>
  )
}
