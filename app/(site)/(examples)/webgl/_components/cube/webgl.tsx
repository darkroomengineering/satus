import { useFrame } from '@react-three/fiber'
import { type Ref, useRef } from 'react'
import type { Group, Mesh } from 'three'

/**
 * How the cube is turned to read as isometric: 45° about its own vertical,
 * then the whole thing tilted by atan(1/√2). Under the orthographic camera
 * that gives the regular hexagon silhouette with three faces meeting at the
 * centre.
 */
const ISO_TILT = Math.atan(1 / Math.SQRT2)
const ISO_SPIN = Math.PI / 4

/** How fast a cube turns about its own vertical, in radians per second. */
const SPIN_RATE = 0.4

interface WebGLCubeProps {
  /**
   * Attached to the outer group so the DOM side's `useWebGLRect` callback
   * can place it: position, scale and visibility all come from the box. The
   * group starts invisible and stays so until placed.
   */
  groupRef: Ref<Group>
}

/**
 * The cube, in the shared canvas, on its box, turning.
 *
 * The box's aspect ratio (see `index.tsx`) makes the cube's silhouette
 * exactly as tall as the box once the group is scaled to its width. The
 * cube turns about its own vertical under the fixed tilt, so it passes
 * through the isometric angle four times a turn, touching all four sides of
 * its box each time.
 */
export function WebGLCube({ groupRef }: WebGLCubeProps) {
  const meshRef = useRef<Mesh>(null)

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
