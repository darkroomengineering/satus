import { useFrame } from '@react-three/fiber'
import type { Rect } from 'hamo'
import { useRef } from 'react'
import type { Group, Mesh } from 'three'

import { useWebGLRect } from '@/webgl/hooks/use-webgl-rect'
import { useLease } from '@/webgl/utils/awake'

// 45° about the cube's vertical, tilted by atan(1/√2): under the orthographic
// camera that reads as a regular hexagon with three faces meeting at the centre.
const ISO_TILT = Math.atan(1 / Math.SQRT2)
const ISO_SPIN = Math.PI / 4

// An isometric hexagon is √2 times as wide as the cube's own edge.
const HEXAGON_TO_EDGE = 1 / Math.SQRT2

/** Radians per second. */
const SPIN_RATE = 0.4

interface WebGLCubeProps {
  /** The box's rect, measured by `index.tsx` with hamo's `useRect`. */
  rect: Rect
}

/**
 * The cube, in the shared canvas, on its box. Its edge is the box width over
 * √2, so at the isometric angle the silhouette fills the box exactly (the
 * box's aspect ratio in `index.tsx` fixes the height).
 */
export function WebGLCube({ rect }: WebGLCubeProps) {
  const groupRef = useRef<Group>(null)
  const meshRef = useRef<Mesh>(null)
  const lease = useLease()

  // The group starts invisible; the hook's render effect places it right
  // after mount.
  useWebGLRect(rect, ({ position, scale, isVisible }) => {
    const group = groupRef.current
    if (!group) return
    group.position.copy(position)
    group.scale.setScalar(scale.x * HEXAGON_TO_EDGE)
    group.visible = isVisible

    // The spin changes every frame, so the canvas has to keep drawing while
    // the cube is on screen. A hold rather than `useHoldAwake(isVisible)`
    // keeps visibility out of React state: a scroll never re-renders.
    if (isVisible) lease.acquire()
    else lease.release()
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
