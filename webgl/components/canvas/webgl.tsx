'use client'

import { OrthographicCamera } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import cn from 'clsx'
import { Suspense } from 'react'
import { SheetProvider } from '~/orchestra/theatre'
import { FlowmapProvider } from '~/webgl/components/flowmap-provider'
import { PostProcessing } from '~/webgl/components/postprocessing'
import { Preload } from '~/webgl/components/preload'
import { RAF } from '~/webgl/components/raf'
import { useCanvas } from './'
import s from './webgl.module.css'

type WebGLCanvasProps = React.HTMLAttributes<HTMLDivElement> & {
  render?: boolean
  postprocessing?: boolean
  alpha?: boolean
  className?: string
}

export function WebGLCanvas({
  render = true,
  postprocessing = false,
  alpha = true,
  className,
  ...props
}: WebGLCanvasProps) {
  const { WebGLTunnel, DOMTunnel } = useCanvas()

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
