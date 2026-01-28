'use client'

import dynamic from 'next/dynamic'
import { WebGLTunnel } from '@/webgl/components/tunnel'
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'

const WebGLTexturedPlane = dynamic(
  () => import('./webgl').then(({ WebGLTexturedPlane }) => WebGLTexturedPlane),
  {
    ssr: false,
  }
)

/**
 * Textured plane component demonstrating useTextureCached.
 *
 * Uses useWebGLElement for unified rect + visibility tracking.
 * The texture is loaded with caching support to prevent duplicate loads.
 */
export function TexturedPlane({
  className,
  textureUrl = '/images/placeholder.jpg',
}: {
  className?: string
  textureUrl?: string
}) {
  const { setRef, rect, isVisible } = useWebGLElement<HTMLDivElement>()

  return (
    <div ref={setRef} className={className}>
      <WebGLTunnel>
        <WebGLTexturedPlane
          rect={rect}
          visible={isVisible}
          textureUrl={textureUrl}
        />
      </WebGLTunnel>
    </div>
  )
}
