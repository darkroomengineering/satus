import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { Mesh } from 'three'
import { LiquidDripMaterial } from './material'

// @refresh reset

export type WebGLLiquidDripProps = {
  /** Whether the source element is in the viewport (gates animation). */
  visible?: boolean
  amplitude?: number
  /** Time multiplier for drip flow speed (default 1.0). */
  speed?: number
}

/**
 * WebGL darkroom-developer drip mesh.
 *
 * A screen-space shader pinned to the viewport (static fullscreen quad — does
 * NOT follow page scroll): a clear developer-chemical sheet at the top that
 * bleeds downward in rivulets. Clicking releases a fresh drop at that column.
 */
export function WebGLLiquidDrip({
  visible = true,
  amplitude = 1.0,
  speed = 1.0,
}: WebGLLiquidDripProps) {
  // useRef (not useState) for the imperative material instance — the project's
  // canonical pattern for class instantiation. Created once; `amplitude` flows
  // in via the effect below, which is the single source of truth for it.
  const materialRef = useRef<LiquidDripMaterial | null>(null)
  if (!materialRef.current) {
    materialRef.current = new LiquidDripMaterial()
  }
  const material = materialRef.current

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

  const meshRef = useRef<Mesh | null>(null)

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

  function spawnDropAtPointer(event: ThreeEvent<MouseEvent>) {
    if (event.uv) material.spawnDrop(event.uv.x)
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: <mesh> is an R3F WebGL object, not a DOM element; the click is a decorative easter-egg with no keyboard path required
    <mesh matrixAutoUpdate={false} ref={meshRef} onClick={spawnDropAtPointer}>
      <planeGeometry />
      <primitive object={material} />
    </mesh>
  )
}
