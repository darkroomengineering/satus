'use client'

import { OrthographicCamera } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import cn from 'clsx'
import { Suspense, useContext } from 'react'
import { SheetProvider } from '@/lib/dev/theatre'
import { FlowmapProvider } from '@/webgl/components/flowmap-provider'
import { PostProcessing } from '@/webgl/components/postprocessing'
import { Preload } from '@/webgl/components/preload'
import { RAF } from '@/webgl/components/raf'
import { CanvasContext } from './'
import s from './webgl.module.css'

type WebGLCanvasProps = React.HTMLAttributes<HTMLDivElement> & {
  render?: boolean
  postprocessing?: boolean
  alpha?: boolean
  className?: string
}

/**
 * Local WebGLCanvas component for legacy (local) canvas mode.
 * Used when Canvas is mounted with local={true}.
 *
 * For GlobalCanvas, see @/webgl/components/global-canvas
 */
export function WebGLCanvas({
  render = true,
  postprocessing = false,
  alpha = true,
  className,
  ...props
}: WebGLCanvasProps) {
  // Use context directly for local tunnels
  const { WebGLTunnel, DOMTunnel } = useContext(CanvasContext)

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
        // camera={{ position: [0, 0, 5000], near: 0.001, far: 10000, zoom: 1 }}
        frameloop="never"
        linear
        flat
        eventSource={document.documentElement}
        eventPrefix="client"
        resize={{ scroll: false, debounce: 500 }}
        style={{ pointerEvents: 'all' }}
      >
        {/* <StateListener onChange={onChange} /> */}
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
          <Preload />
        </SheetProvider>
      </Canvas>
      <DOMTunnel.Out />
    </div>
  )
}
