/**
 * Optional Features for Root Layout
 *
 * Conditionally loads optional features based on project configuration.
 * This prevents unused features from being mounted in the root layout.
 *
 * WebGL/WebGPU features require:
 * 1. NEXT_PUBLIC_ENABLE_WEBGL=true (build-time opt-in)
 * 2. Runtime GPU capability check (device must support WebGL/WebGPU)
 *
 * The env variable prevents heavy WebGL libraries from being bundled
 * when the project doesn't use 3D features. Runtime detection ensures
 * graceful fallback on devices without GPU support.
 */

'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { detectGPUCapability } from '@/webgl/utils/gpu-detection'

// Build-time opt-in to avoid loading heavy WebGL libraries by default
const webglEnabled = process.env.NEXT_PUBLIC_ENABLE_WEBGL === 'true'
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
  const [hasGPU, setHasGPU] = useState(false)

  useEffect(() => {
    setIsClient(true)

    // Runtime GPU capability check
    if (webglEnabled) {
      const capability = detectGPUCapability()
      setHasGPU(capability.hasGPU)

      if (!capability.hasGPU) {
        console.info(
          '🎮 WebGL enabled but no GPU detected. 3D features disabled.'
        )
      }
    }
  }, [])

  if (!isClient) return null

  // Only render WebGL canvas if both env opt-in AND device has GPU
  const shouldRenderWebGL = webglEnabled && hasGPU

  return (
    <>
      {/* GSAP Runtime - always included (lightweight) */}
      <GSAPRuntime />
      {/* WebGL/WebGPU Canvas - only if enabled AND device has GPU */}
      {shouldRenderWebGL && <LazyGlobalCanvas />}
      {/* Development tools - only in development */}
      {isDevelopment && <OrchestraTools />}
    </>
  )
}
