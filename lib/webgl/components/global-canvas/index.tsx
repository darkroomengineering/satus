'use client'

import { OrthographicCamera } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import cn from 'clsx'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { SheetProvider } from '@/lib/dev/theatre'
import { useWebGLStore } from '@/lib/webgl/store'
import { FlowmapProvider } from '../flowmap-provider'
import { PostProcessing } from '../postprocessing'
import { Preload } from '../preload'
import { RAF } from '../raf'
import s from './global-canvas.module.css'

type GlobalCanvasProps = {
  /** Enable R3F render loop. Defaults to true. */
  render?: boolean
  /** Enable post-processing effects. Defaults to false. */
  postprocessing?: boolean
  /** Enable alpha channel. Defaults to true. */
  alpha?: boolean
  /** Additional CSS class for the container. */
  className?: string
}

/**
 * GlobalCanvas — A lazy, persistent WebGL canvas with CSS visibility optimization.
 *
 * Features:
 * - **Lazy Initialization**: Only mounts when first WebGL page is visited
 * - **Persistent**: Stays mounted once activated (no context recreation)
 * - **CSS Visibility**: Uses visibility:hidden when inactive (preserves WebGL context)
 * - **RAF Pausing**: Stops render loop when not active (zero CPU overhead)
 * - **Zero overhead for non-WebGL pages**: No canvas until needed
 *
 * Note: We use CSS visibility instead of React Activity because Activity can
 * cause WebGL context loss during mode transitions.
 *
 * Place this in your root layout (app/layout.tsx).
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { GlobalCanvas } from '@/lib/webgl/components/global-canvas'
 *
 * export default function Layout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <GlobalCanvas />
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // In a page with WebGL content
 * import { Wrapper } from '@/components/layout/wrapper'
 * import { WebGLTunnel } from '@/lib/webgl/components/tunnel'
 *
 * export default function WebGLPage() {
 *   return (
 *     <Wrapper webgl>
 *       <WebGLTunnel>
 *         <My3DScene />
 *       </WebGLTunnel>
 *       <section>HTML content overlaying 3D</section>
 *     </Wrapper>
 *   )
 * }
 * ```
 */
export function GlobalCanvas({
  render = true,
  postprocessing = false,
  alpha = true,
  className,
}: GlobalCanvasProps) {
  const { isActivated, isActive, getWebGLTunnel, getDOMTunnel } =
    useWebGLStore()

  // Don't render anything until activated
  if (!isActivated) {
    return null
  }

  // Get tunnel singletons (always available once we reach here)
  const WebGLTunnel = getWebGLTunnel()
  const DOMTunnel = getDOMTunnel()

  // Only render when active
  const shouldRender = render && isActive

  return (
    <div
      className={cn(s.globalCanvas, className)}
      style={{
        visibility: isActive ? 'visible' : 'hidden',
        pointerEvents: isActive ? 'auto' : 'none',
      }}
    >
      <Canvas
        gl={{
          precision: 'highp',
          powerPreference: 'high-performance',
          // Disable MSAA when DPR is high to avoid redundant work
          antialias:
            !postprocessing &&
            (typeof window !== 'undefined'
              ? window.devicePixelRatio < 2
              : true),
          alpha,
          ...(postprocessing && { stencil: false, depth: false }),
        }}
        dpr={[1, 2]}
        orthographic
        frameloop="never"
        linear
        flat
        {...(typeof document !== 'undefined' && {
          eventSource: document.documentElement,
        })}
        eventPrefix="client"
        resize={{ scroll: false, debounce: 500 }}
        style={{ pointerEvents: isActive ? 'all' : 'none' }}
      >
        <SheetProvider id="webgl">
          <OrthographicCamera
            makeDefault
            position={[0, 0, 5000]}
            near={0.001}
            far={10000}
            zoom={1}
          />
          <RAF render={shouldRender} />
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

/**
 * Dynamic import wrapper for GlobalCanvas.
 * Use this to avoid SSR issues and enable code splitting.
 */
export const LazyGlobalCanvas = dynamic(
  () => Promise.resolve({ default: GlobalCanvas }),
  { ssr: false }
)
