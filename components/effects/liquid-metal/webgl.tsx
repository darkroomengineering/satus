import { useFrame, useThree } from '@react-three/fiber'
import { useObjectFit, useWindowSize } from 'hamo'
import { useEffect, useRef, useState } from 'react'
import type { Mesh } from 'three'
import { useWebGLRect } from '@/webgl/hooks/use-webgl-rect'
import { LiquidMetalMaterial } from './material'

// @refresh reset

type WebGLLiquidMetalProps = {
  rect: DOMRect
  /** Whether the element is visible in the viewport */
  visible?: boolean
  amplitude?: number
  /** Time multiplier for blob drift speed (default 1.0) */
  speed?: number
}

/**
 * WebGL liquid-metal metaball mesh — mirrors WebGLAnimatedGradient exactly.
 *
 * A raymarched fullscreen quad rendering 5 smooth-unioned SDF spheres as
 * liquid red metal, shaded with fresnel + specular + procedural env reflection.
 * The blobs drift, merge, and split like developing-tray chemicals.
 */
export function WebGLLiquidMetal({
  rect,
  visible = true,
  amplitude = 1.0,
  speed = 1.0,
}: WebGLLiquidMetalProps) {
  const [material] = useState(
    () =>
      new LiquidMetalMaterial({
        amplitude,
      })
  )

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
    // Slow, hypnotic motion: 0.12 base scale keeps the blobs languid
    material.time = clock.getElapsedTime() * speed * 0.12
  })

  return (
    <mesh matrixAutoUpdate={false} ref={meshRef}>
      <planeGeometry />
      <primitive object={material} />
    </mesh>
  )
}
