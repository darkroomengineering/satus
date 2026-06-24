'use client'

import { OrthographicCamera, Preload } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import cn from 'clsx'
import { Suspense } from 'react'
import { SheetProvider } from '@/lib/dev/theatre'
import { FlowmapProvider } from '@/webgl/components/flowmap-provider'
import { PostProcessing } from '@/webgl/components/postprocessing'
import { RAF } from '@/webgl/components/raf'
import { useCanvas } from './'
import s from './webgl.module.css'

type WebGLCanvasProps = React.HTMLAttributes<HTMLDivElement> & {
  render?: boolean
  postprocessing?: boolean
  alpha?: boolean
  className?: string
}

/**
 * The r3f canvas itself. Lazy-loaded by `Canvas` (see ./index) once the
 * device supports WebGL; reads its tunnels from the surrounding CanvasContext.
 */
export function WebGLCanvas({
  render = true,
  postprocessing = false,
  alpha = true,
  className,
  ...props
}: WebGLCanvasProps) {
  // Use context directly for local tunnels
  const { WebGLTunnel, DOMTunnel } = useCanvas()

  if (!(WebGLTunnel && DOMTunnel)) {
    return null
  }

  return (
    <div className={cn(s.webgl, className)} {...props}>
      <Canvas
        gl={{
          precision: 'highp',
          powerPreference: 'high-performance',
          // Disable MSAA when DPR is high to avoid redundant work
          antialias: !postprocessing && window.devicePixelRatio < 2,
          alpha,
          ...(postprocessing && { stencil: false, depth: false }),
        }}
        dpr={[1, 2]}
        orthographic
        frameloop="never"
        linear
        flat
        eventSource={document.documentElement}
        eventPrefix="client"
        resize={{ scroll: false, debounce: 500 }}
        // Keep the fixed, full-screen canvas from swallowing DOM clicks. r3f
        // still gets pointer events via `eventSource={document.documentElement}`,
        // so 3D raycasting works while the DOM underneath stays interactive.
        style={{ pointerEvents: 'none' }}
      >
        <SheetProvider id="webgl">
          <OrthographicCamera
            makeDefault
            position={[0, 0, 5000]}
            near={0.001}
            far={10000}
            zoom={1}
          />
          <RAF render={render} />
          <FlowmapProvider>
            {postprocessing && <PostProcessing />}
            <Suspense>
              <WebGLTunnel.Out />
            </Suspense>
          </FlowmapProvider>
          <Preload all />
        </SheetProvider>
      </Canvas>
      <DOMTunnel.Out />
    </div>
  )
}
