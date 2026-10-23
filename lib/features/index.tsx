'use client'

import { lazy, Suspense, use } from 'react'
import { browser } from 'react-dom'

const isDevelopment = process.env.NODE_ENV === 'development'

const OrchestraTools = lazy(() =>
  import('@/dev').then((mod) => ({ default: mod.OrchestraTools }))
)

// Mounted once in the shared layout so the WebGL context persists across route
// navigation; pages portal content in via <WebGLTunnel>.
const LazyWebGLCanvas = lazy(() =>
  import('@/webgl/components/canvas').then((mod) => ({
    default: mod.Canvas,
  }))
)

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
      <Suspense key="webgl" fallback={null}>
        <LazyWebGLCanvas root />
      </Suspense>
      {isDevelopment && (
        <Suspense fallback={null}>
          <OrchestraTools />
        </Suspense>
      )}
    </>
  )
}
