'use client'

import { useRect } from '@darkroom.engineering/hamo'
import dynamic from 'next/dynamic'
import type { CSSProperties, ComponentProps } from 'react'
import { WebGLTunnel } from '~/libs/webgl/components/tunnel'

const WebGLAnimatedGradient = dynamic(
  () =>
    import('./webgl').then(
      ({ WebGLAnimatedGradient }) => WebGLAnimatedGradient
    ),
  {
    ssr: false,
  }
)

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
        <WebGLAnimatedGradient rect={rect} {...props} />
      </WebGLTunnel>
    </div>
  )
}
