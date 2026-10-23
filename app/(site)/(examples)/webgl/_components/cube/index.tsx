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
  className?: string | undefined
}

/**
 * A cube that follows a box laid out by CSS. hamo measures the box once per
 * resize and `useWebGLRect` (in `webgl.tsx`) turns the rect into a canvas
 * position; nothing reads layout while scrolling.
 */
export function Cube({ className }: CubeProps) {
  // Transforms on the box or a wrapper reach the cube through a
  // `TransformProvider` (see `../parallax`), so `ignoreTransform` keeps them
  // out of the rect.
  const [setRectRef, rect] = useRect({ ignoreTransform: true })

  return (
    // The aspect ratio is the bounds of the isometric silhouette (a regular
    // hexagon, √3/2 as wide as tall). The cube touches all four sides at the
    // isometric angle, so a gap or overlap there is a sync error.
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
