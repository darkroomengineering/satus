import { useTexture } from '@react-three/drei'
import { type Ref, useEffect, useState } from 'react'
import { LinearFilter, type Mesh, MeshBasicMaterial } from 'three'

type WebGLImageProps = {
  src: string | undefined
  /**
   * Attached to the plane so the DOM side's `useWebGLRect` callback can place
   * it. The plane starts invisible and stays so until placed.
   */
  meshRef: Ref<Mesh>
}

type WebGLImageMeshProps = {
  src: string
  meshRef: Ref<Mesh>
}

/**
 * WebGL image plane.
 *
 * Hooks can't be conditional, so the `useTexture` call (and the real decode
 * it triggers) only happens once a real `src` exists — see
 * {@link WebGLImageMesh}. Without this split, `useTexture(src ?? '', ...)`
 * would resolve `''` to the document's own URL and three's `ImageLoader`
 * would attempt to decode the page's HTML as an image.
 */
export function WebGLImage({ src, meshRef }: WebGLImageProps) {
  if (!src) return null

  return <WebGLImageMesh src={src} meshRef={meshRef} />
}

function WebGLImageMesh({ src, meshRef }: WebGLImageMeshProps) {
  const [material] = useState(() => new MeshBasicMaterial())

  // Mount effect owns the material it creates — dispose it on unmount.
  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  // The texture comes from drei's `useTexture` cache, keyed by `src` — it's
  // shared across every consumer of the same URL, so it is NOT owned here
  // and must never be disposed by this component (that would corrupt other
  // consumers still reading it). The cache retains one texture per distinct
  // src it has ever been asked to load; this effect only clears the
  // material's reference to it, on src change and on unmount, so the
  // material never points at a stale/replaced texture.
  useEffect(() => {
    return () => {
      material.map = null
      material.needsUpdate = true
    }
  }, [material, src])

  useTexture(src, (texture) => {
    texture.magFilter = texture.minFilter = LinearFilter
    texture.generateMipmaps = false

    // `immutability` fires on these two writes because `material` came out of
    // useState. It stays that way on purpose. The material has to exist during
    // render (it is handed to <primitive object={material} /> below), so it
    // cannot be built in an effect; and lazily instantiating it into a ref
    // during render just trades this finding for a `refs` one, since that is a
    // ref write during render. Assigning a Three.js material's map is
    // imperative GPU work on an object React only stores — there is no React
    // state to keep in sync, and the identity never changes.
    // react-doctor-disable-next-line react-hooks-js/immutability
    material.map = texture // oxlint-disable-line react/immutability -- imperative Three.js GPU work on a render-stable object
    material.needsUpdate = true
  })

  // Placed (position, scale, visibility, matrix) by the DOM side.
  return (
    <mesh ref={meshRef} matrixAutoUpdate={false} visible={false}>
      <planeGeometry />
      <primitive object={material} />
    </mesh>
  )
}
