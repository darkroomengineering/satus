'use client'

import { useRect } from 'hamo'
import dynamic from 'next/dynamic'
import type { CSSProperties, ComponentProps } from 'react'
import { WebGLTunnel } from '~/webgl/components/tunnel'

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
} & Omit<ComponentProps<typeof WebGLAnimatedGradient>, 'rect'>

export function AnimatedGradient({
  className,
  style,
  ...props
}: AnimatedGradientProps) {
  const [setRectRef, rect] = useRect()

  return (
    <div ref={setRectRef} className={className} style={style}>
      <WebGLTunnel>
        <WebGLAnimatedGradient rect={toDOMRect(rect)} {...props} />
      </WebGLTunnel>
    </div>
  )
}
