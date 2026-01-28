/**
 * Optional Features for Root Layout
 *
 * Conditionally loads optional features based on usage.
 * WebGL/WebGPU canvas is lazy-loaded and only mounts when a page
 * uses `<Wrapper webgl>`. No configuration required.
 */

'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const isDevelopment = process.env.NODE_ENV === 'development'

// Lazy imports to avoid loading unused features
const LazyGlobalCanvas = dynamic(
  () =>
    import('@/webgl/components/global-canvas').then((mod) => ({
      default: mod.LazyGlobalCanvas,
    })),
  { ssr: false }
)

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

/**
 * Conditionally loads optional root layout features
 *
 * Note: React Compiler handles memoization automatically.
 * No manual useMemo/useCallback needed.
 */
export function OptionalFeatures() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return null

  return (
    <>
      {/* GSAP Runtime - always included (lightweight) */}
      <GSAPRuntime />
      {/* WebGL/WebGPU Canvas - lazy loaded, only mounts when <Wrapper webgl> is used */}
      <LazyGlobalCanvas />
      {/* Development tools - only in development */}
      {isDevelopment && <OrchestraTools />}
    </>
  )
}
