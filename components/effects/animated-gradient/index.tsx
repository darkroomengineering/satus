'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps, CSSProperties } from 'react'
import { WebGLTunnel } from '@/webgl/components/tunnel'
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'

const WebGLAnimatedGradient = dynamic(
  () =>
    import('./webgl').then(
      ({ WebGLAnimatedGradient }) => WebGLAnimatedGradient
    ),
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

type AnimatedGradientProps = {
  className?: string
  style?: CSSProperties
} & Omit<ComponentProps<typeof WebGLAnimatedGradient>, 'rect' | 'visible'>

/**
 * Animated gradient effect with WebGL rendering.
 *
 * Uses useWebGLElement for unified rect + visibility tracking.
 * The visible prop is passed to WebGL component for performance optimization.
 */
export function AnimatedGradient({
  className,
  style,
  ...props
}: AnimatedGradientProps) {
  const { setRef, rect, isVisible } = useWebGLElement<HTMLDivElement>()

  return (
    <div ref={setRef} className={className} style={style}>
      <WebGLTunnel>
        <WebGLAnimatedGradient
          rect={toDOMRect(rect)}
          visible={isVisible}
          {...props}
        />
      </WebGLTunnel>
    </div>
  )
}
