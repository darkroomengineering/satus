// USAGE — WebGL / React Three Fiber (R3F)
// 1. Add <GlobalCanvas /> once in app/layout.tsx via OptionalFeatures
//    (lib/features/index.tsx wraps it in a real dynamic() import — no SSR,
//    real chunk boundary via import('@/webgl/components/global-canvas')):
//
//   import { OptionalFeatures } from '@/lib/features'
//   export default function Layout({ children }) {
//     return <html><body>{children}<OptionalFeatures /></body></html>
//   }
//
// 2. On a page that needs 3D content, pass `webgl` to <Wrapper>:
//
//   import { Wrapper } from '@/components/layout/wrapper'
//   import { WebGLTunnel } from '@/lib/webgl/components/tunnel'
//
//   export default function MyPage() {
//     return (
//       <Wrapper webgl>
//         <WebGLTunnel>
//           <My3DScene />   {/* runs inside the R3F Canvas */}
//         </WebGLTunnel>
//         <section>HTML content overlaying the 3D canvas</section>
//       </Wrapper>
//     )
//   }
//
// 3. Inside the tunnel, use standard R3F hooks (useFrame, useThree, etc.)
//    and Theatre.js for timeline animation (see lib/dev/theatre).
//    useWebGLRect syncs a DOM element's bounding box to a mesh position.
//
// Full walkthrough: see the manual (app/page.tsx) step 5 "Add a plugin".

'use client'

import {
  AdaptiveDpr,
  OrthographicCamera,
  PerformanceMonitor,
  Preload,
} from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import cn from 'clsx'
import { Suspense } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { SheetProvider } from '@/lib/dev/theatre'
import { useWebGLStore } from '@/lib/webgl/store'
import { createRenderer } from '@/lib/webgl/utils/create-renderer'
import { detectGPUCapability } from '@/lib/webgl/utils/gpu-detection'
import { RAF } from '../raf'
import s from './global-canvas.module.css'

type GlobalCanvasProps = {
  /** Enable R3F render loop. Defaults to true. */
  render?: boolean
  /** Enable alpha channel. Defaults to true. */
  alpha?: boolean
  /** Additional CSS class for the container. */
  className?: string
  /** Force WebGL renderer (skip WebGPU). Defaults to false. */
  forceWebGL?: boolean
}

/**
 * GlobalCanvas — A lazy, persistent GPU canvas with WebGPU support.
 *
 * Features:
 * - **WebGPU First**: Uses WebGPU when available, falls back to WebGL
 * - **Lazy Initialization**: Only mounts when first WebGL page is visited
 * - **Persistent**: Stays mounted once activated (no context recreation)
 * - **CSS Visibility**: Uses visibility:hidden when inactive (preserves context)
 * - **RAF Pausing**: Stops render loop when not active (zero CPU overhead)
 * - **Zero overhead for non-WebGL pages**: No canvas until needed
 *
 * Note: We use CSS visibility instead of React Activity because Activity can
 * cause GPU context loss during mode transitions.
 *
 * Place this in your root layout (app/layout.tsx) via `<OptionalFeatures />`.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { OptionalFeatures } from '@/lib/features'
 *
 * export default function Layout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <OptionalFeatures />
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
  alpha = true,
  className,
  forceWebGL = false,
}: GlobalCanvasProps) {
  const { isActivated, isActive, getWebGLTunnel, getDOMTunnel } = useWebGLStore(
    useShallow((s) => ({
      isActivated: s.isActivated,
      isActive: s.isActive,
      getWebGLTunnel: s.getWebGLTunnel,
      getDOMTunnel: s.getDOMTunnel,
    }))
  )

  // Get device capabilities for renderer config
  const capability = detectGPUCapability()

  // Don't render anything until activated by <Wrapper webgl>
  if (!isActivated) {
    return null
  }

  // Don't render if device has no GPU support
  if (!capability.hasGPU) {
    if (process.env.NODE_ENV === 'development') {
      console.info('🎮 No GPU detected. WebGL/WebGPU canvas disabled.')
    }
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
        gl={async (props) => {
          const { renderer } = await createRenderer({
            canvas: props.canvas as HTMLCanvasElement,
            alpha,
            antialias: capability.dpr < 2,
            powerPreference: 'high-performance',
            stencil: true,
            depth: true,
            forceWebGL,
          })
          return renderer
        }}
        dpr={[1, capability.dpr]}
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
          <PerformanceMonitor />
          <AdaptiveDpr />
          <OrthographicCamera
            makeDefault
            position={[0, 0, 5000]}
            near={0.001}
            far={10000}
            zoom={1}
          />
          <RAF render={shouldRender} />
          <Suspense>
            <WebGLTunnel.Out />
          </Suspense>
          <Preload all />
        </SheetProvider>
      </Canvas>
      <DOMTunnel.Out />
    </div>
  )
}
