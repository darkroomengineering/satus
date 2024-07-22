'use client'

import { useRect } from '@darkroom.engineering/hamo'
import { WebGLTunnel } from 'libs/webgl/components/tunnel'
import dynamic from 'next/dynamic'

const WebGLBox = dynamic(
  () => import('./webgl').then(({ WebGLBox }) => WebGLBox),
  {
    ssr: false,
  },
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
