'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps, CSSProperties } from 'react'
import { WebGLTunnel } from '@/webgl/components/tunnel'
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'

const WebGLLiquidDrip = dynamic(
  () => import('./webgl').then(({ WebGLLiquidDrip }) => WebGLLiquidDrip),
  {
    ssr: false,
  }
)

const toDOMRect = (
  rect: {
    width?: number
    height?: number
    top?: number
    left?: number
    right?: number
    bottom?: number
    x?: number
    y?: number
  } | null
): DOMRect => ({
  top: rect?.top ?? 0,
  right: rect?.right ?? 0,
  bottom: rect?.bottom ?? 0,
  left: rect?.left ?? 0,
  width: rect?.width ?? 0,
  height: rect?.height ?? 0,
  x: rect?.x ?? 0,
  y: rect?.y ?? 0,
  toJSON: () => ({
    top: rect?.top ?? 0,
    right: rect?.right ?? 0,
    bottom: rect?.bottom ?? 0,
    left: rect?.left ?? 0,
    width: rect?.width ?? 0,
    height: rect?.height ?? 0,
    x: rect?.x ?? 0,
    y: rect?.y ?? 0,
  }),
})

type LiquidDripProps = {
  className?: string
  style?: CSSProperties
} & Omit<ComponentProps<typeof WebGLLiquidDrip>, 'rect' | 'visible'>

/**
 * Liquid red-metal drip hero background effect.
 *
 * A 2D screen-space curtain of glossy red liquid metal that hangs from the top
 * of the hero section and drips downward in organic tendrils toward the bottom
 * of the first fold. The hero's overflow:hidden clips it to the viewport.
 *
 * Shaded as red chrome: dark floor, Kodak-red fresnel rim, tight Blinn-Phong
 * specular, and a procedural studio-reflection gradient.
 *
 * Drop-in replacement for <LiquidMetal> — same useWebGLElement/WebGLTunnel
 * architecture, transparent alpha so it composites over the black hero background.
 */
export function LiquidDrip({ className, style, ...props }: LiquidDripProps) {
  const { setRef, rect, isVisible } = useWebGLElement<HTMLDivElement>()

  return (
    <div ref={setRef} className={className} style={style}>
      <WebGLTunnel>
        <WebGLLiquidDrip
          rect={toDOMRect(rect)}
          visible={isVisible}
          {...props}
        />
      </WebGLTunnel>
    </div>
  )
}
