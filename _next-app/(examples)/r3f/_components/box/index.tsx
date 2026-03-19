'use client'

import dynamic from 'next/dynamic'
import { WebGLTunnel } from '@/webgl/components/tunnel'
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'

const WebGLBox = dynamic(
  () => import('./webgl').then(({ WebGLBox }) => WebGLBox),
  {
    ssr: false,
  }
)

/**
 * Example WebGL component with visibility-optimized rendering.
 *
 * Uses useWebGLElement for unified rect + visibility tracking.
 * The isVisible prop is passed to WebGL component so it can skip
 * expensive operations when off-screen.
 */
export function Box({ className }: { className: string }) {
  const { setRef, rect, isVisible } = useWebGLElement<HTMLDivElement>()

  return (
    <div ref={setRef} className={className}>
      <WebGLTunnel>
        <WebGLBox rect={rect} visible={isVisible} />
      </WebGLTunnel>
    </div>
  )
}
