import { useFrame } from '@react-three/fiber'
import type { Rect } from 'hamo'
import { useRef } from 'react'
import type { Group, Mesh } from 'three'

import { useWebGLRect } from '@/webgl/hooks/use-webgl-rect'

/**
 * How the cube is turned to read as isometric: 45° about its own vertical,
 * then the whole thing tilted by atan(1/√2). Under the orthographic camera
 * that gives the regular hexagon silhouette with three faces meeting at the
 * centre.
 */
const ISO_TILT = Math.atan(1 / Math.SQRT2)
const ISO_SPIN = Math.PI / 4

/** An isometric hexagon is √2 times as wide as the cube's own edge. */
const HEXAGON_TO_EDGE = 1 / Math.SQRT2

/** How fast a cube turns about its own vertical, in radians per second. */
const SPIN_RATE = 0.4

interface WebGLCubeProps {
  /** The box's rect, measured by `index.tsx` with hamo's `useRect`. */
  rect: Rect
}

/**
 * The cube, in the shared canvas, on its box, turning.
 *
 * `useWebGLRect` gives the box's centre in the camera's units — one unit
 * per CSS pixel, origin mid-screen — and its size on screen. The cube's
 * edge is the box's width over √2, so at the isometric angle its
 * silhouette is exactly as wide as the box, and the box's aspect ratio
 * (see `index.tsx`) makes it exactly as tall. The cube turns about its own
 * vertical under the fixed tilt, so it passes through that angle four times
 * a turn, touching all four sides of its box each time.
 */
export function WebGLCube({ rect }: WebGLCubeProps) {
  const groupRef = useRef<Group>(null)
  const meshRef = useRef<Mesh>(null)

  // Position, scale and visibility all come from the box. The group starts
  // invisible; the hook's render effect places it right after this mounts.
  useWebGLRect(rect, ({ position, scale, isVisible }) => {
    const group = groupRef.current
    if (!group) return
    group.position.copy(position)
    group.scale.setScalar(scale.x * HEXAGON_TO_EDGE)
    group.visible = isVisible
  })

  // From the clock, not a per-frame increment, so a dropped frame skips
  // ahead rather than slowing the turn.
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = ISO_SPIN + clock.elapsedTime * SPIN_RATE
    }
  })

  return (
    <group ref={groupRef} visible={false} rotation-x={ISO_TILT}>
      <mesh ref={meshRef} rotation-y={ISO_SPIN}>
        <boxGeometry />
        <meshNormalMaterial />
      </mesh>
    </group>
  )
}
