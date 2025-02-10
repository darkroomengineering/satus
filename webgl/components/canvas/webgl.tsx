'use client'

import { OrthographicCamera } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { SheetProvider } from '~/orchestra/theatre'
import { FlowmapProvider } from '../flowmap'
import { PostProcessing } from '../postprocessing'
import { Preload } from '../preload'
import { RAF } from '../raf'
import { useCanvas } from './'
import s from './webgl.module.css'

type WebGLCanvasProps = React.HTMLAttributes<HTMLDivElement> & {
  render?: boolean
  postprocessing?: boolean
}

export function WebGLCanvas({
  render = true,
  postprocessing = false,
  ...props
}: WebGLCanvasProps) {
  const { WebGLTunnel, DOMTunnel } = useCanvas()

  return (
    <div className={s.webgl} {...props}>
      <Canvas
        gl={{
          precision: 'highp',
          powerPreference: 'high-performance',
          antialias: true,
          alpha: true,
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
        resize={{ scroll: false, debounce: { scroll: 0, resize: 500 } }}
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
