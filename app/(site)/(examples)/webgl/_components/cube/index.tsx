'use client'

import cn from 'clsx'
import dynamic from 'next/dynamic'
import { useRef } from 'react'
import type { Group } from 'three'

import { WebGLTunnel } from '@/webgl/components/tunnel'
import { useWebGLRect } from '@/webgl/hooks/use-webgl-rect'

// Three and the fiber stay out of the page's script until the box mounts.
const WebGLCube = dynamic(
  () => import('./webgl').then(({ WebGLCube }) => WebGLCube),
  { ssr: false }
)

/** An isometric hexagon is √2 times as wide as the cube's own edge. */
const HEXAGON_TO_EDGE = 1 / Math.SQRT2

interface CubeProps {
  /** Sizes and places the box: any width, any layout. */
  className?: string | undefined
}

/**
 * A cube that follows a box laid out by CSS.
 *
 * The box is a plain div. Size and place it from a stylesheet like any
 * other element; the cube, drawn in the shared canvas, takes its size and
 * place from it. `useWebGLRect` measures the box once per resize and, on
 * each scroll event, transform change or re-measure, turns that rect and the
 * scroll into a position that the callback copies onto the cube's group.
 * Nothing here reads layout while scrolling, and nothing about the cube is
 * positioned in JavaScript.
 */
export function Cube({ className }: CubeProps) {
  const groupRef = useRef<Group>(null)

  // Any transform on the box, or on a wrapper round it, reaches the cube
  // through a `TransformProvider` (see `../parallax`), never through the
  // measurement: `ignoreTransform` keeps it out of the rect.
  const [setRectRef, , update] = useWebGLRect(
    ({ position, scale, isVisible }) => {
      const group = groupRef.current
      if (!group) return
      group.position.copy(position)
      // The cube's edge is the box's width over √2, so at the isometric angle
      // its silhouette is exactly as wide as the box.
      group.scale.setScalar(scale.x * HEXAGON_TO_EDGE)
      group.visible = isVisible
    },
    { ignoreTransform: true }
  )

  return (
    // The box only fixes its proportions and draws its outline, so box and
    // cube can be compared by eye. A cube's isometric silhouette is a regular
    // hexagon with a vertex at the top, √3/2 as wide as it is tall; the box
    // is that silhouette's bounds. The turning cube touches all four sides as
    // it passes the isometric angle, so a gap or overlap there is a sync
    // error.
    <div
      ref={setRectRef}
      className={cn(
        'aspect-[0.8660254] outline-1 -outline-offset-1 outline-current outline-dashed',
        className
      )}
    >
      <WebGLTunnel>
        {/* The group mounts after the box (the canvas waits for window load),
            with no scroll event to place it: place it as it attaches. */}
        <WebGLCube
          groupRef={(group) => {
            groupRef.current = group
            if (group) update()
          }}
        />
      </WebGLTunnel>
    </div>
  )
}
