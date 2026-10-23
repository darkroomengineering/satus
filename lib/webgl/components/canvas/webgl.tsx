'use client'

import {
  OrthographicCamera,
  PerformanceMonitor,
  type PerformanceMonitorApi,
  Preload,
} from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import cn from 'clsx'
import { useWindowSize } from 'hamo'
import { Suspense, useEffect, useState } from 'react'

import { SheetProvider } from '@/lib/dev/theatre'
import { bumpContextGeneration } from '@/lib/webgl/store'
import { FlowmapProvider } from '@/webgl/components/flowmap-provider'
import { PostProcessing } from '@/webgl/components/postprocessing'
import { RAF } from '@/webgl/components/raf'
import { useSleepCount, wake } from '@/webgl/utils/awake'
import type { Tunnel } from '@/webgl/utils/tunnel'

import { useCanvas } from './'

import s from './webgl.module.css'

type WebGLCanvasProps = React.HTMLAttributes<HTMLDivElement> & {
  render?: boolean | 'always'
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
      wake()
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
 * Wakes the canvas when it changes size or pixel ratio (a resize clears the
 * drawing buffer, so an idle canvas would stay blank) and when tunnel content
 * mounts, unmounts or re-renders.
 */
function WakeOnChange({ tunnel }: { tunnel: Tunnel }) {
  const size = useThree((state) => state.size)
  const dpr = useThree((state) => state.viewport.dpr)

  useEffect(() => {
    wake()
  }, [size, dpr])

  useEffect(() => tunnel.subscribe(wake), [tunnel])

  return null
}

/** Times `AdaptiveDpr` may reverse direction before it stops adjusting. */
const MAX_DPR_REVERSALS = 3

interface DprHistory {
  /** Direction of the last change: 1 up, -1 down, 0 none yet. */
  direction: number
  reversals: number
}

/**
 * Lowers the canvas DPR on sustained frame drops and raises it again on
 * recovery, by stepping `factor` between 0 (DPR 1) and 1 (the full ceiling).
 *
 * drei's `PerformanceMonitor` measures fps from the time between frames, and
 * the canvas draws no frames while it sleeps. It is remounted every time the
 * canvas stops drawing, so each measurement only covers continuous frames.
 * One decision takes 10 samples of 250 ms, so a single `wake()` window
 * (2 s) never adjusts anything; only sustained drawing (scrolling, a hold)
 * does. On the `MAX_DPR_REVERSALS`th change of direction it settles on the
 * lower of the two factors and stops, so a device whose fps sits on a
 * boundary can't keep resizing the canvas.
 */
function AdaptiveDpr({
  factor,
  onFactor,
}: {
  factor: number
  onFactor: (factor: number) => void
}) {
  const sleeps = useSleepCount()
  const [history, setHistory] = useState<DprHistory>({
    direction: 0,
    reversals: 0,
  })

  if (history.reversals >= MAX_DPR_REVERSALS) return null

  const adjust = (api: PerformanceMonitorApi) => {
    if (api.factor === factor) return
    const direction = Math.sign(api.factor - factor)
    const reversed = history.direction !== 0 && direction !== history.direction
    const reversals = history.reversals + (reversed ? 1 : 0)
    setHistory({ direction, reversals })
    if (reversals < MAX_DPR_REVERSALS || direction < 0) onFactor(api.factor)
  }

  return (
    <PerformanceMonitor
      key={sleeps}
      factor={factor}
      step={0.25}
      onIncline={adjust}
      onDecline={adjust}
    />
  )
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
  const { width } = useWindowSize()
  const [dprFactor, setDprFactor] = useState(1)

  if (!(WebGLTunnel && DOMTunnel)) {
    return null
  }

  // The canvas DPR has one owner: this `dpr` prop. r3f overwrites any
  // `setDpr` call with it on the next render. It stays a range so r3f clamps
  // `devicePixelRatio` into it and keeps following the display when the
  // window moves or zooms. The ceiling is 2, or 1 when postprocessing runs
  // above 2048 CSS px (its full-screen buffers at 2x cost too much fill
  // rate). `AdaptiveDpr` lowers it towards 1, never below: the planes stand
  // in for DOM images and text, and under 1 device pixel per CSS pixel they
  // look blurrier than the page around them.
  const ceiling = postprocessing && width !== undefined && width > 2048 ? 1 : 2
  const maxDpr = 1 + (ceiling - 1) * dprFactor

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
        dpr={[1, maxDpr]}
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
          <AdaptiveDpr factor={dprFactor} onFactor={setDprFactor} />
          <ContextLossHandler />
          <WakeOnChange tunnel={WebGLTunnel} />
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
