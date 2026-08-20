'use client'

import { OrthographicCamera, Preload } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import cn from 'clsx'
import { Suspense, useEffect } from 'react'

import { SheetProvider } from '@/lib/dev/theatre'
import { bumpContextGeneration } from '@/lib/webgl/store'
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
  /**
   * Which GPU simulations `FlowmapProvider` mounts. Defaults to none
   * (opt-in) — pass the sims you actually use, e.g. `['flowmap']`, to avoid
   * paying for a GPU pass and window listeners with no consumer.
   */
  simTypes?: ('fluid' | 'flowmap')[]
}

/**
 * Attaches `webglcontextlost`/`webglcontextrestored` listeners to the r3f
 * canvas element. `preventDefault()` on loss tells the browser to attempt
 * automatic restoration instead of treating the loss as permanent (mobile
 * GPU resets and long-backgrounded tabs are the common causes — the root
 * canvas persists across client-side navigation, so without this the sims
 * stay visually broken for the rest of the session). On restore, bumps the
 * shared context generation counter so GPU-resource-owning hooks
 * (useFluidSim, useFlowmapSim) rebuild via their existing create/destroy
 * effect cleanup — their hand-built double-buffered render targets sit
 * outside three.js's own tracked-restore path and don't come back on their
 * own.
 */
function ContextLossHandler() {
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    const canvasEl = gl.domElement

    const handleContextLost = (event: Event) => {
      event.preventDefault()
    }
    const handleContextRestored = () => {
      bumpContextGeneration()
    }

    canvasEl.addEventListener('webglcontextlost', handleContextLost)
    canvasEl.addEventListener('webglcontextrestored', handleContextRestored)

    return () => {
      canvasEl.removeEventListener('webglcontextlost', handleContextLost)
      canvasEl.removeEventListener(
        'webglcontextrestored',
        handleContextRestored
      )
    }
  }, [gl])

  return null
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
  simTypes,
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
          <ContextLossHandler />
          <FlowmapProvider {...(simTypes && { simTypes })}>
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
