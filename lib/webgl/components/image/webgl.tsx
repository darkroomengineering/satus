import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { Rect } from 'hamo'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  type Mesh,
  MeshBasicMaterial,
  type Texture,
} from 'three'

import { useWebGLRect } from '@/webgl/hooks/use-webgl-rect'
import { wake } from '@/webgl/utils/awake'

type WebGLImageProps = {
  src: string | undefined
  /** The DOM image's rect, measured in `./index.tsx` with hamo's `useRect`. */
  rect: Rect
}

type WebGLImageMeshProps = {
  src: string
  rect: Rect
}

// Planes using each texture. drei's `useTexture` cache shares one texture per
// src across every plane and keeps it until cleared, and the root canvas
// outlives navigation, so a texture no plane has used for `RELEASE_DELAY_MS`
// is cleared from the cache and its GPU memory freed. Never dispose it
// anywhere else: other planes may still be drawing it.
const users = new Map<Texture, number>()
const pendingRelease = new Map<Texture, ReturnType<typeof setTimeout>>()

// Long enough for the next page to mount a plane with the same src, which
// waits for its DOM image to load, and for Strict Mode's effect replay. A
// shorter delay re-decodes and re-uploads a shared image on every navigation.
const RELEASE_DELAY_MS = 5000

function retain(texture: Texture) {
  clearTimeout(pendingRelease.get(texture))
  pendingRelease.delete(texture)
  users.set(texture, (users.get(texture) ?? 0) + 1)
}

// Every plane with this src shares the texture, so the settings are the same
// for all of them and apply once. Mipmaps with trilinear filtering keep a
// downscaled image from shimmering as it moves.
const configured = new WeakSet<Texture>()

function configure(texture: Texture, maxAnisotropy: number) {
  if (configured.has(texture)) return
  configured.add(texture)
  texture.generateMipmaps = true
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.anisotropy = Math.min(4, maxAnisotropy)
  texture.needsUpdate = true
}

function release(texture: Texture, src: string) {
  const left = (users.get(texture) ?? 1) - 1
  if (left > 0) {
    users.set(texture, left)
    return
  }
  users.delete(texture)
  pendingRelease.set(
    texture,
    setTimeout(() => {
      pendingRelease.delete(texture)
      useTexture.clear(src)
      texture.dispose()
    }, RELEASE_DELAY_MS)
  )
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
export function WebGLImage({ src, rect }: WebGLImageProps) {
  if (!src) return null

  return <WebGLImageMesh src={src} rect={rect} />
}

function WebGLImageMesh({ src, rect }: WebGLImageMeshProps) {
  const meshRef = useRef<Mesh>(null)
  const [material] = useState(() => new MeshBasicMaterial())

  // Mount effect owns the material it creates — dispose it on unmount.
  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  const gl = useThree((state) => state.gl)
  const texture = useTexture(src)

  // A layout effect so the filters are set before drei's `useTexture` uploads
  // the texture in its passive effect, and the upload happens once.
  useLayoutEffect(() => {
    configure(texture, gl.capabilities.getMaxAnisotropy())
    retain(texture)

    // `immutability` fires on this write because `material` came out of
    // useState. It stays that way on purpose. The material has to exist during
    // render (it is handed to <primitive object={material} /> below), so it
    // cannot be built in an effect; and lazily instantiating it into a ref
    // during render just trades this finding for a `refs` one, since that is a
    // ref write during render. Assigning a Three.js material's map is
    // imperative GPU work on an object React only stores; there is no React
    // state to keep in sync, and the identity never changes.
    // react-doctor-disable-next-line react-hooks-js/immutability
    material.map = texture // oxlint-disable-line react/immutability -- imperative Three.js GPU work on a render-stable object
    material.needsUpdate = true
    wake()

    return () => {
      material.map = null
      material.needsUpdate = true
      release(texture, src)
    }
  }, [gl, material, src, texture])

  // Placed on the DOM image's rect: position, scale, visibility and matrix.
  // The plane starts invisible; the hook's render effect places it right
  // after this mounts.
  useWebGLRect(rect, ({ position, scale, isVisible }) => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.position.copy(position)
    mesh.scale.copy(scale)
    mesh.visible = isVisible
    mesh.updateMatrix()
  })

  return (
    <mesh ref={meshRef} matrixAutoUpdate={false} visible={false}>
      <planeGeometry />
      <primitive object={material} />
    </mesh>
  )
}
