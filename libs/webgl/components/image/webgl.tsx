import { useLenis } from 'lenis/react'
import { useRef, useState } from 'react'
import { LinearFilter, type Mesh, MeshBasicMaterial } from 'three'
import { useTexture } from '~/libs/webgl/hooks/use-texture'
import { useWebGLRect } from '~/libs/webgl/hooks/use-webgl-rect'

type WebGLImageProps = {
  src: string | undefined
  rect: DOMRect
}

export function WebGLImage({ src, rect }: WebGLImageProps) {
  const meshRef = useRef<Mesh>(null!)
  const [material] = useState(() => new MeshBasicMaterial())

  useTexture(src, (texture) => {
    texture.magFilter = texture.minFilter = LinearFilter
    texture.generateMipmaps = false

    material.map = texture
    material.needsUpdate = true
  })

  const getWebGLRect = useWebGLRect(rect)

  useLenis(() => {
    const { position, scale } = getWebGLRect()

    meshRef.current.scale.set(scale.x, scale.y, scale.x)
    meshRef.current.position.set(position.x, position.y, 0)
  })

  useWebGLRect(rect, ({ position, scale }) => {
    meshRef.current.position.set(position.x, position.y, position.z)
    meshRef.current.scale.set(scale.x, scale.y, scale.z)
    meshRef.current.updateMatrix()
  })

  return (
    <mesh ref={meshRef as any} matrixAutoUpdate={false}>
      <planeGeometry />
      <primitive object={material} />
    </mesh>
  )
}
