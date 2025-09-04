'use client'

import { useContextBridge } from '@react-three/drei'
import { Fragment, type PropsWithChildren, useId } from 'react'
import { TransformContext } from '~/hooks/use-transform'
import { SheetContext, SheetProvider, useSheet } from '~/orchestra/theatre'
import { useCanvas } from '~/webgl/components/canvas'

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

export function DOMTunnel({ children }: PropsWithChildren) {
  const { DOMTunnel } = useCanvas()

  const uuid = useId()

  return (
    <DOMTunnel.In>
      <Fragment key={uuid}>{children}</Fragment>
    </DOMTunnel.In>
  )
}
