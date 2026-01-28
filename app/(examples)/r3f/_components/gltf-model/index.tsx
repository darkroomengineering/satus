'use client'

import dynamic from 'next/dynamic'
import { WebGLTunnel } from '@/webgl/components/tunnel'
import { useWebGLElement } from '@/webgl/hooks/use-webgl-element'

const WebGLGLTFModel = dynamic(
  () => import('./webgl').then(({ WebGLGLTFModel }) => WebGLGLTFModel),
  {
    ssr: false,
  }
)

/**
 * GLTF model component demonstrating useGLTFLoader and disposeObject.
 *
 * Uses useWebGLElement for unified rect + visibility tracking.
 * Models are loaded with Draco and KTX2 support for optimal compression.
 */
export function GLTFModel({
  className,
  modelUrl = '/models/placeholder.glb',
}: {
  className?: string
  modelUrl?: string
}) {
  const { setRef, rect, isVisible } = useWebGLElement<HTMLDivElement>()

  return (
    <div ref={setRef} className={className}>
      <WebGLTunnel>
        <WebGLGLTFModel rect={rect} visible={isVisible} modelUrl={modelUrl} />
      </WebGLTunnel>
    </div>
  )
}
