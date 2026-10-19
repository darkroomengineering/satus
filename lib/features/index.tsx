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

// Root WebGL canvas. Mounted once here (in the shared layout) so the context
// persists across route navigation; pages portal content in via <WebGLTunnel>.
const LazyWebGLCanvas = lazy(() =>
  import('@/webgl/components/canvas').then((mod) => ({
    default: mod.Canvas,
  }))
)

/**
 * Conditionally loads optional root layout features
 *
 * Note: React Compiler handles memoization automatically.
 * No manual useMemo/useCallback needed.
 */
export function OptionalFeatures() {
  return (
    <Suspense fallback={null}>
      <BrowserFeatures />
    </Suspense>
  )
}

function BrowserFeatures() {
  use(browser())

  return (
    <>
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
