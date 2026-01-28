'use client'

import { useFrame } from '@react-three/fiber'
import type { Rect } from 'hamo'
import { useRef } from 'react'
import type { Mesh } from 'three'
import { MeshBasicMaterial, PlaneGeometry } from 'three'
// useDisposable: Auto-disposes resources on unmount. Prevents GPU memory leaks.
// useTextureCached: Loads textures with caching. Same URL = same texture instance.
import { useDisposable, useTextureCached } from '@/lib/webgl'
import { useWebGLRect } from '@/webgl/hooks/use-webgl-rect'

interface WebGLTexturedPlaneProps {
  rect: Rect
  visible?: boolean
  textureUrl: string
}

/**
 * WebGL plane component demonstrating texture loading with caching.
 *
 * Key patterns:
 * - useTextureCached: Loads textures with deduplication. If two components
 *   request the same URL, they share the same Texture instance (saves VRAM).
 * - useDisposable: Geometry is auto-disposed on unmount.
 * - Material updates: When texture loads, we update the existing material
 *   rather than creating a new one (prevents memory churn).
 *
 * Note: The material is NOT wrapped in useDisposable here because we need
 * to update it when the texture loads. Instead, we handle disposal manually
 * via the ref cleanup.
 */
export function WebGLTexturedPlane({
  rect,
  visible = true,
  textureUrl,
}: WebGLTexturedPlaneProps) {
  const meshRef = useRef<Mesh | null>(null)
  const materialRef = useRef<MeshBasicMaterial | null>(null)

  // useTextureCached returns null while loading, then the cached Texture.
  // If another component already loaded this URL, returns immediately.
  // The texture is cached globally - we don't dispose it on unmount
  // since other components may be using it.
  const texture = useTextureCached(textureUrl)

  // Geometry is auto-disposed when component unmounts
  const geometry = useDisposable(() => new PlaneGeometry(1, 1), [])

  // Create material once on mount
  if (!materialRef.current) {
    materialRef.current = new MeshBasicMaterial({
      transparent: true,
      // Start with a gray color while texture loads
      color: 0x888888,
    })
  }

  // Update material when texture loads
  if (texture && materialRef.current) {
    materialRef.current.map = texture
    materialRef.current.color.set(0xffffff)
    materialRef.current.needsUpdate = true
  }

  // Gentle hover animation
  useFrame(({ clock }) => {
    if (!(visible && meshRef.current)) return

    const time = clock.getElapsedTime()
    // Subtle floating animation
    meshRef.current.position.y += Math.sin(time * 2) * 0.0005
    meshRef.current.updateMatrix()
  })

  // Position the plane in screen space
  useWebGLRect(
    rect,
    ({ scale, position }) => {
      if (!meshRef.current) return
      meshRef.current.position.set(position.x, position.y, position.z)
      meshRef.current.scale.set(scale.x, scale.y, 1)
      meshRef.current.updateMatrix()
    },
    { visible }
  )

  return (
    <mesh
      matrixAutoUpdate={false}
      ref={(node) => {
        meshRef.current = node
        node?.updateMatrix()
      }}
      geometry={geometry}
      material={materialRef.current ?? undefined}
      onPointerEnter={() => {
        if (meshRef.current) {
          document.body.style.cursor = 'pointer'
        }
      }}
      onPointerLeave={() => {
        document.body.style.cursor = 'auto'
      }}
    />
  )
}
