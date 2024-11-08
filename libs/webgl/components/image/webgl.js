import { useTexture } from '@react-three/drei'
import { useWebGLRect } from 'libs/webgl/hooks/use-webgl-rect'
import { useRef, useState } from 'react'
import { LinearFilter, MeshBasicMaterial } from 'three'

export function WebGLImage({ src, rect }) {
  const meshRef = useRef()
  const [material] = useState(() => new MeshBasicMaterial())

  useTexture(src, (texture) => {
    texture.magFilter = texture.minFilter = LinearFilter
    texture.generateMipmaps = false

    material.map = texture
    material.needsUpdate = true
  })

  useWebGLRect(rect, ({ position, scale }) => {
    meshRef.current.position.set(position.x, position.y, position.z)
    meshRef.current.scale.set(scale.x, scale.y, scale.z)
    meshRef.current.updateMatrix()
  })

  return (
    <mesh ref={meshRef} matrixAutoUpdate={false}>
      <planeGeometry />
      <primitive object={material} />
    </mesh>
  )
}
