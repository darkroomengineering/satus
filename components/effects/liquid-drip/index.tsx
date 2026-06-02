'use client'

import dynamic from 'next/dynamic'
import type { CSSProperties } from 'react'
import { WebGLTunnel } from '@/webgl/components/tunnel'
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'
import type { WebGLLiquidDripProps } from './webgl'

const WebGLLiquidDrip = dynamic(
  () => import('./webgl').then(({ WebGLLiquidDrip }) => WebGLLiquidDrip),
  {
    ssr: false,
  }
)

type LiquidDripProps = {
  className?: string
  style?: CSSProperties
} & Omit<WebGLLiquidDripProps, 'visible'>

/**
 * Darkroom-developer drip hero effect.
 *
 * A full-width sheet of clear developer chemical clinging to the top of the
 * viewport, running off in thin rivulets — like fixer dripping off a print hung
 * to dry. Pinned to the viewport (does not scroll), and clicking releases a
 * fresh drop. Drawn on the global WebGL canvas via the tunnel.
 */
export function LiquidDrip({ className, style, ...props }: LiquidDripProps) {
  const { setRef, isVisible } = useWebGLElement<HTMLDivElement>()

  return (
    <div ref={setRef} className={className} style={style}>
      <WebGLTunnel>
        <WebGLLiquidDrip visible={isVisible} {...props} />
      </WebGLTunnel>
    </div>
  )
}
