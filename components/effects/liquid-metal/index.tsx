'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps, CSSProperties } from 'react'
import { WebGLTunnel } from '@/webgl/components/tunnel'
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'

const WebGLLiquidMetal = dynamic(
  () => import('./webgl').then(({ WebGLLiquidMetal }) => WebGLLiquidMetal),
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

type LiquidMetalProps = {
  className?: string
  style?: CSSProperties
} & Omit<ComponentProps<typeof WebGLLiquidMetal>, 'rect' | 'visible'>

/**
 * Liquid red-metal metaball hero background effect.
 *
 * Raymarched metaballs (smooth-unioned SDF spheres) that drift, merge,
 * and split like chemicals developing in a darkroom tray.
 * Shaded as liquid red metal: dark core, Kodak-red fresnel rim, specular,
 * and a procedural environment reflection.
 *
 * Drop-in replacement for <AnimatedGradient> — same useWebGLElement/WebGLTunnel
 * architecture, transparent alpha so it composites over the black hero background.
 */
export function LiquidMetal({ className, style, ...props }: LiquidMetalProps) {
  const { setRef, rect, isVisible } = useWebGLElement<HTMLDivElement>()

  return (
    <div ref={setRef} className={className} style={style}>
      <WebGLTunnel>
        <WebGLLiquidMetal
          rect={toDOMRect(rect)}
          visible={isVisible}
          {...props}
        />
      </WebGLTunnel>
    </div>
  )
}
