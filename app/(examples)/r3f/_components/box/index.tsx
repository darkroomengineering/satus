'use client'

import { useScrollTrigger } from 'hamo'
import dynamic from 'next/dynamic'
import { useRef } from 'react'
import { WebGLTunnel } from '@/webgl/components/tunnel'
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'

const WebGLBox = dynamic(
  () => import('./webgl').then(({ WebGLBox }) => WebGLBox),
  {
    ssr: false,
  }
)

export function Box({ className }: { className: string }) {
  const { setRef, rect, isVisible } = useWebGLElement<HTMLDivElement>()
  const progressRef = useRef(0)

  const [setTriggerRef] = useScrollTrigger({
    start: 'top bottom',
    end: 'bottom top',
    debug: 'box-spin',
    onProgress: ({ progress }) => {
      progressRef.current = progress
    },
  })

  return (
    <div
      ref={(node) => {
        setRef(node)
        ;(setTriggerRef as (el: HTMLElement | null) => void)(node)
      }}
      className={className}
    >
      <WebGLTunnel>
        <WebGLBox rect={rect} visible={isVisible} progressRef={progressRef} />
      </WebGLTunnel>
    </div>
  )
}
