import { OrthographicCamera } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { SheetProvider } from 'libs/theatre'
import { FlowmapProvider } from '../flowmap'
import { Preload } from '../preload'
import { RAF } from '../raf'
import { useCanvas } from './'
import s from './webgl.module.scss'

export function WebGLCanvas({ render = true, ...props }) {
  const { WebGLTunnel, DOMTunnel } = useCanvas()

  return (
    <div className={s.webgl} {...props}>
      <Canvas
        gl={{
          precision: 'highp',
          powerPreference: 'high-performance',
          antialias: true,
          alpha: true,
          // stencil: false,
          // depth: false,
        }}
        dpr={[1, 2]}
        orthographic
        // camera={{ position: [0, 0, 5000], near: 0.001, far: 10000, zoom: 1 }}
        frameloop="never"
        linear
        flat
        eventSource={document.documentElement}
        eventPrefix="client"
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
            {/* <PostProcessing /> */}
            <WebGLTunnel.Out />
          </FlowmapProvider>
          <Preload />
        </SheetProvider>
      </Canvas>
      <DOMTunnel.Out />
    </div>
  )
}
