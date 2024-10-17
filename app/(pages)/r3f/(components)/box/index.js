'use client'

import { useRect } from '@darkroom.engineering/hamo'
import dynamic from 'next/dynamic'
import { WebGLTunnel } from '~/libs/webgl/components/tunnel'

const WebGLBox = dynamic(
  () => import('./webgl').then(({ WebGLBox }) => WebGLBox),
  {
    ssr: false,
  }
)

export function Box({ className }) {
  const [setRectRef, rect] = useRect()

  return (
    <div ref={setRectRef} className={className}>
      <WebGLTunnel>
        <WebGLBox rect={rect} />
      </WebGLTunnel>
    </div>
  )
}
