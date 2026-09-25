'use client'

import cn from 'clsx'
import { useRect } from 'hamo'
import dynamic from 'next/dynamic'

import { WebGLTunnel } from '@/webgl/components/tunnel'

// Three and the fiber stay out of the page's script until the box mounts.
const WebGLCube = dynamic(
  () => import('./webgl').then(({ WebGLCube }) => WebGLCube),
  { ssr: false }
)

interface CubeProps {
  /** Sizes and places the box: any width, any layout. */
  className?: string | undefined
}

/**
 * A cube that follows a box laid out by CSS.
 *
 * The box is a plain div. Size and place it from a stylesheet like any
 * other element; the cube, drawn in the shared canvas, takes its size and
 * place from it. hamo measures the box once per resize, and `useWebGLRect`
 * in `webgl.tsx` turns that rect and the scroll into a position on each
 * scroll event, transform change or re-measure. Nothing here reads layout
 * while scrolling, and nothing about the cube is positioned in JavaScript.
 */
export function Cube({ className }: CubeProps) {
  // Any transform on the box, or on a wrapper round it, reaches the cube
  // through a `TransformProvider` (see `../parallax`), never through the
  // measurement: `ignoreTransform` keeps it out of the rect.
  const [setRectRef, rect] = useRect({ ignoreTransform: true })

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
        <WebGLCube rect={rect} />
      </WebGLTunnel>
    </div>
  )
}
