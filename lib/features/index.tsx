/**
 * Optional Features for Root Layout
 *
 * Conditionally loads optional features based on usage.
 */

'use client'

import { lazy, Suspense, use } from 'react'
import { browser } from 'react-dom'

const isDevelopment = process.env.NODE_ENV === 'development'

// Lazy imports to avoid loading unused features
const OrchestraTools = lazy(() =>
  import('@/dev').then((mod) => ({ default: mod.OrchestraTools }))
)

const GSAPRuntime = lazy(() =>
  import('@/components/effects/gsap').then((mod) => ({
    default: mod.GSAPRuntime,
  }))
)

// Root WebGL canvas. Mounted once here (in the shared layout) so the context
// persists across route navigation; pages portal content in via <WebGLTunnel>.
const LazyWebGLCanvas = lazy(() =>
  import('@/webgl/components/canvas').then((mod) => ({
    default: mod.Canvas,
  }))
)

interface OptionalFeaturesProps {
  /**
   * Mount the GSAP runtime, which hands GSAP's clock to Tempus so tweens share
   * one frame loop with Lenis and WebGL.
   *
   * Off by default because mounting it downloads the GSAP core (~43KB
   * gzipped), and a site that never animates should not pay for it. Opt in
   * from the layout when any page under it uses `useGSAP`/`gsap`:
   *
   * ```tsx
   * <OptionalFeatures gsap />
   * ```
   *
   * Without it, GSAP still works wherever it is imported — it just runs on
   * GSAP's own ticker rather than in Tempus order, so scrubbed ScrollTriggers
   * can render a frame behind the scroll position.
   */
  gsap?: boolean
}

/**
 * Conditionally loads optional root layout features
 *
 * Note: React Compiler handles memoization automatically.
 * No manual useMemo/useCallback needed.
 */
export function OptionalFeatures({ gsap = false }: OptionalFeaturesProps) {
  return (
    <Suspense fallback={null}>
      <BrowserFeatures gsap={gsap} />
    </Suspense>
  )
}

function BrowserFeatures({ gsap }: OptionalFeaturesProps) {
  use(browser())

  return (
    <>
      {/* GSAP runtime — opt-in, see the `gsap` prop */}
      {gsap && (
        <Suspense fallback={null}>
          <GSAPRuntime />
        </Suspense>
      )}
      {/* Persistent root WebGL canvas (no-op on non-WebGL devices) */}
      <Suspense key="webgl" fallback={null}>
        <LazyWebGLCanvas root />
      </Suspense>
      {/* Development tools - only in development */}
      {isDevelopment && (
        <Suspense fallback={null}>
          <OrchestraTools />
        </Suspense>
      )}
    </>
  )
}
