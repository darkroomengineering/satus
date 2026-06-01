import { useFrame, useThree } from '@react-three/fiber'
import { useObjectFit, useWindowSize } from 'hamo'
import { useEffect, useRef, useState } from 'react'
import type { Mesh } from 'three'
import { useWebGLRect } from '@/webgl/hooks/use-webgl-rect'
import { LiquidDripMaterial } from './material'

// @refresh reset

type WebGLLiquidDripProps = {
  rect: DOMRect
  /** Whether the element is visible in the viewport */
  visible?: boolean
  amplitude?: number
  /** Time multiplier for drip flow speed (default 1.0) */
  speed?: number
}

/**
 * WebGL liquid-drip mesh — mirrors WebGLLiquidMetal exactly.
 *
 * A 2D screen-space curtain of red liquid metal that hangs from the top of
 * the hero and drips downward in organic tendrils clipped to the first fold.
 * Shaded as glossy red chrome: dark core, Kodak-red fresnel rim, specular
 * glint, and a procedural studio-reflection gradient.
 */
export function WebGLLiquidDrip({
  rect,
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

  const aspect = useObjectFit(rect.width, rect.height, 1, 1, 'contain')

  useEffect(() => {
    material.aspect.set(aspect[0] ?? 1, aspect[1] ?? 1)
  }, [material, aspect])

  const { width: windowWidth = 0, height: windowHeight = 0 } = useWindowSize()

  useEffect(() => {
    material.resolution.set(windowWidth, windowHeight)
  }, [material, windowWidth, windowHeight])

  const viewport = useThree((state) => state.viewport)

  useEffect(() => {
    material.dpr = viewport.dpr
  }, [material, viewport])

  const meshRef = useRef<Mesh>(null!)

  useWebGLRect(
    rect,
    ({ scale, position, rotation }) => {
      meshRef.current.position.set(position.x, position.y, position.z)
      meshRef.current.rotation.set(rotation.x, rotation.y, rotation.z)
      meshRef.current.scale.set(scale.x, scale.y, scale.z)
      meshRef.current.updateMatrix()
    },
    { visible }
  )

  useFrame(({ clock }) => {
    if (!visible) return
    // Slow, viscous drip flow: 0.08 base scale keeps drips languid
    material.time = clock.getElapsedTime() * speed * 0.08
  })

  return (
    <mesh matrixAutoUpdate={false} ref={meshRef}>
      <planeGeometry />
      <primitive object={material} />
    </mesh>
  )
}
