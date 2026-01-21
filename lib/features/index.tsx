/**
 * Optional Features for Root Layout
 *
 * Conditionally loads optional features based on project configuration.
 * This prevents unused features from being mounted in the root layout.
 */

'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'

// Feature detection - opt-in to avoid loading heavy WebGL libraries by default
const hasWebGL = process.env.NEXT_PUBLIC_ENABLE_WEBGL === 'true'
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
 */
export function OptionalFeatures() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const features = useMemo(() => {
    if (!isClient) return []

    const components = []

    // GSAP Runtime - always included (lightweight)
    components.push(<GSAPRuntime key="gsap" />)

    // WebGL Canvas - only if WebGL is enabled
    if (hasWebGL) {
      components.push(<LazyGlobalCanvas key="webgl" />)
    }

    // Development tools - only in development
    if (isDevelopment) {
      components.push(<OrchestraTools key="orchestra" />)
    }

    return components
  }, [isClient])

  if (!isClient) return null

  return <>{features}</>
}
