'use client'

import { useFrame } from '@react-three/fiber'
import type { Rect } from 'hamo'
import { useRef } from 'react'
import type { Mesh } from 'three'
import { BoxGeometry, MeshNormalMaterial } from 'three'
import { useCurrentSheet } from '@/dev/theatre'
import { useTheatre } from '@/dev/theatre/hooks/use-theatre'
// useDisposable: Automatically disposes Three.js resources (geometries, materials, textures)
// when the component unmounts or dependencies change. Prevents memory leaks.
import { useDisposable } from '@/lib/webgl'
import { useWebGLRect } from '@/webgl/hooks/use-webgl-rect'

interface WebGLBoxProps {
  theatreKey?: string
  rect: Rect
  /** Whether the element is visible in the viewport */
  visible?: boolean
}

/**
 * WebGL box component with visibility-aware optimizations.
 *
 * Demonstrates:
 * - useDisposable for automatic geometry/material cleanup
 * - Visibility-based optimization (skip work when off-screen)
 *
 * When visible is false:
 * - useWebGLRect skips position computations
 * - useFrame skips rotation updates
 * - Component still mounts (preserves state) but does minimal work
 */
export function WebGLBox({
  theatreKey = 'box',
  rect,
  visible = true,
}: WebGLBoxProps) {
  const meshRef = useRef<Mesh | null>(null)

  // useDisposable creates the geometry and automatically calls .dispose() on unmount.
  // The empty dependency array [] means it's created once and persists until unmount.
  const geometry = useDisposable(() => new BoxGeometry(1, 1, 1), [])

  // Materials are also disposable. If you had a color prop that changes,
  // you'd pass [color] as deps to recreate the material when color changes.
  const material = useDisposable(() => new MeshNormalMaterial(), [])

  useFrame(({ clock }) => {
    // Skip expensive updates when off-screen
    if (!(visible && meshRef.current)) return

    const time = clock.getElapsedTime()
    meshRef.current.rotation.x = time
    meshRef.current.rotation.y = time
    meshRef.current.updateMatrix()
  })

  const sheet = useCurrentSheet()
  useTheatre(
    sheet,
    theatreKey,
    {
      x: 0,
      y: 0,
      z: 0,
    },
    {
      onValuesChange: ({ x, y, z }) => {
        meshRef.current?.position.set(x, y, z)
      },
    }
  )

  // Pass visibility to skip computations when off-screen
  useWebGLRect(
    rect,
    ({ scale, position, rotation }) => {
      meshRef.current?.position.set(position.x, position.y, position.z)
      meshRef.current?.rotation.set(rotation.x, rotation.y, rotation.z)
      meshRef.current?.scale.setScalar(scale.x)
      meshRef.current?.updateMatrix()
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
      material={material}
    />
  )
}
