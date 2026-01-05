import { useTexture } from '@react-three/drei'
import type { Rect } from 'hamo'
import { useRef, useState } from 'react'
import { LinearFilter, type Mesh, MeshBasicMaterial } from 'three'
import { useWebGLRect } from '~/webgl/hooks/use-webgl-rect'

type WebGLImageProps = {
  src: string | undefined
  rect: Rect
  /** Whether the element is visible in the viewport */
  visible?: boolean
}

/**
 * WebGL image mesh with visibility-aware optimizations.
 */
export function WebGLImage({ src, rect, visible = true }: WebGLImageProps) {
  const meshRef = useRef<Mesh>(null!)
  const [material] = useState(() => new MeshBasicMaterial())

  useTexture(src || '', (texture) => {
    if (!src) return

    texture.magFilter = texture.minFilter = LinearFilter
    texture.generateMipmaps = false

    material.map = texture
    material.needsUpdate = true
  })

  // Pass visibility to skip computations when off-screen
  useWebGLRect(
    rect,
    ({
      position,
      scale,
    }: {
      position: { x: number; y: number; z: number }
      scale: { x: number; y: number; z: number }
    }) => {
      meshRef.current.position.set(position.x, position.y, position.z)
      meshRef.current.scale.set(scale.x, scale.y, scale.z)
      meshRef.current.updateMatrix()
    },
    { visible }
  )

  return (
    <mesh ref={meshRef} matrixAutoUpdate={false}>
      <planeGeometry />
      <primitive object={material} />
    </mesh>
  )
}
