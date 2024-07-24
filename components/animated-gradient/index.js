'use client'

import { useRect } from '@darkroom.engineering/hamo'
import { WebGLTunnel } from 'libs/webgl/components/tunnel'
import dynamic from 'next/dynamic'

const WebGLAnimatedGradient = dynamic(
  () =>
    import('./webgl').then(
      ({ WebGLAnimatedGradient }) => WebGLAnimatedGradient,
    ),
  {
    ssr: false,
  },
)

export function AnimatedGradient({ className, style, ...props }) {
  const [setRectRef, rect] = useRect()

  return (
    <div ref={setRectRef} className={className} style={style}>
      <WebGLTunnel>
        <WebGLAnimatedGradient rect={rect} {...props} />
      </WebGLTunnel>
    </div>
  )
}
