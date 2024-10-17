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
    // TODO: Whaaat is going on with this?
    const { x, y, width, height } = getWebGLRect()

    meshRef.current.scale.set(width, height, width)
    meshRef.current.position.set(x, y, 0)

    meshRef.current.updateMatrix()
  }, [getWebGLRect])

  return (
    <mesh ref={meshRef} matrixAutoUpdate={false}>
      <planeGeometry />
      <primitive object={material} />
    </mesh>
  )
}
