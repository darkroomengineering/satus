/**
 * Optional Features for Root Layout
 *
 * Conditionally loads optional features based on usage.
 */

'use client'

import dynamic from 'next/dynamic'

const isDevelopment = process.env.NODE_ENV === 'development'

// Lazy imports to avoid loading unused features
const OrchestraTools = dynamic(
  () => import('@/dev').then((mod) => ({ default: mod.OrchestraTools })),
  { ssr: false }
)

const GSAPRuntime = dynamic(
  () =>
    import('@/components/effects/gsap').then((mod) => ({
      default: mod.GSAPRuntime,
    })),
  { ssr: false }
)

// Root WebGL canvas. Mounted once here (in the shared layout) so the context
// persists across route navigation; pages portal content in via <WebGLTunnel>.
const LazyWebGLCanvas = dynamic(
  () =>
    import('@/webgl/components/canvas').then((mod) => ({
      default: mod.Canvas,
    })),
  { ssr: false }
)

/**
 * Conditionally loads optional root layout features
 *
 * Note: React Compiler handles memoization automatically.
 * No manual useMemo/useCallback needed.
 */
export function OptionalFeatures() {
  return (
    <>
      {/* GSAP Runtime - always included (lightweight) */}
      <GSAPRuntime />
      {/* Persistent root WebGL canvas (no-op on non-WebGL devices) */}
      <LazyWebGLCanvas root />
      {/* Development tools - only in development */}
      {isDevelopment && <OrchestraTools />}
    </>
  )
}
