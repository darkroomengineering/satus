'use client'

import dynamic from 'next/dynamic'
import { WebGLTunnel } from '@/webgl/components/tunnel'

// Dynamically import PerfMonitor to avoid SSR issues
const PerfMonitor = dynamic(
  () => import('@/lib/webgl').then(({ PerfMonitor }) => PerfMonitor),
  { ssr: false }
)

/**
 * Injects PerfMonitor into the GlobalCanvas via WebGLTunnel.
 *
 * PerfMonitor tracks renderer.info stats and warns about memory leaks:
 * - Geometry count growth (indicates missing dispose() calls)
 * - Texture count growth (indicates missing texture cleanup)
 *
 * Only renders in development mode to avoid production overhead.
 * The PerfMonitor component itself also checks NODE_ENV.
 *
 * Usage: Place this component anywhere in your page that uses <Wrapper webgl>.
 * It will portal the PerfMonitor into the shared Canvas context.
 */
export function PerfMonitorWrapper() {
  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <WebGLTunnel>
      <PerfMonitor
        // Log stats every 300 frames (~5 seconds at 60fps)
        logInterval={300}
        // Warn if geometries or textures grow by more than 10
        leakThreshold={10}
      />
    </WebGLTunnel>
  )
}
