import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Mesh } from 'three'
import { LiquidDripMaterial } from './material'

// @refresh reset

type WebGLLiquidDripProps = {
  /** Whether the source element is in the viewport (gates animation). */
  visible?: boolean
  amplitude?: number
  /** Time multiplier for drip flow speed (default 1.0). */
  speed?: number
}

/**
 * WebGL darkroom-developer drip mesh.
 *
 * A screen-space shader (screenUV-based) pinned to the viewport: the quad is
 * sized to the canvas and positioned statically, so the effect does NOT follow
 * page scroll. Clicking releases a fresh drop at the clicked column.
 */
export function WebGLLiquidDrip({
  visible = true,
  amplitude = 1.0,
  speed = 1.0,
}: WebGLLiquidDripProps) {
  const [material] = useState(() => new LiquidDripMaterial({ amplitude }))

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  useEffect(() => {
    material.amplitude = amplitude
  }, [material, amplitude])

  const size = useThree((state) => state.size)

  useEffect(() => {
    material.resolution.set(size.width, size.height)
  }, [material, size])

  const meshRef = useRef<Mesh>(null!)

  // Pin the quad to the full viewport (static — does not scroll with the page).
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.position.set(0, 0, 0)
    mesh.scale.set(size.width, size.height, 1)
    mesh.updateMatrix()
  }, [size])

  useFrame(({ clock }) => {
    if (!visible) return
    material.time = clock.getElapsedTime() * speed * 0.3
  })

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (event.uv) material.spawnDrop(event.uv.x)
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: <mesh> is an R3F WebGL object, not a DOM element
    <mesh matrixAutoUpdate={false} ref={meshRef} onClick={handleClick}>
      <planeGeometry />
      <primitive object={material} />
    </mesh>
  )
}
