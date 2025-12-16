import { useTexture } from '@react-three/drei'
import type { Rect } from 'hamo'
import { useRef, useState } from 'react'
import { LinearFilter, type Mesh, MeshBasicMaterial } from 'three'
import { useWebGLRect } from '~/webgl/hooks/use-webgl-rect'

type WebGLImageProps = {
  src: string | undefined
  rect: Rect
}

export function WebGLImage({ src, rect }: WebGLImageProps) {
  const meshRef = useRef<Mesh>(null!)
  const [material] = useState(() => new MeshBasicMaterial())

  useTexture(src || '', (texture) => {
    if (!src) return

    texture.magFilter = texture.minFilter = LinearFilter
    texture.generateMipmaps = false

    material.map = texture
    material.needsUpdate = true
  })

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
    }
  )
  return (
    <mesh ref={meshRef} matrixAutoUpdate={false}>
      <planeGeometry />
      <primitive object={material} />
    </mesh>
  )
}
