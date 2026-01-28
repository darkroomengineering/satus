'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'

/**
 * Stats tracked by PerfMonitor.
 */
export interface PerfStats {
  /** Number of render calls per frame */
  calls: number
  /** Number of triangles rendered */
  triangles: number
  /** Number of active geometries in memory */
  geometries: number
  /** Number of active textures in memory */
  textures: number
  /** Timestamp of when stats were captured */
  timestamp: number
}

export type PerfMonitorProps = {
  /**
   * Enable the monitor. Defaults to true in development, false in production.
   */
  enabled?: boolean
  /**
   * How often to log stats (in frames). Default: 300 (every ~5 seconds at 60fps)
   */
  logInterval?: number
  /**
   * Callback when stats are captured. Use this to implement custom display.
   */
  onStats?: (stats: PerfStats) => void
  /**
   * Threshold for memory leak warnings. If geometries or textures increase
   * by this amount over the monitoring period, a warning is logged.
   * Default: 10
   */
  leakThreshold?: number
}

/**
 * Development-only performance monitor for Three.js.
 *
 * Tracks renderer.info stats and warns about potential memory leaks.
 * Only active in development (NODE_ENV check).
 *
 * @example
 * ```tsx
 * // Basic usage - logs to console periodically
 * <Canvas>
 *   <PerfMonitor />
 *   <YourScene />
 * </Canvas>
 * ```
 *
 * @example
 * ```tsx
 * // Custom stats handler
 * <Canvas>
 *   <PerfMonitor
 *     onStats={(stats) => {
 *       // Send to your monitoring service
 *       analytics.track('webgl_stats', stats)
 *     }}
 *   />
 *   <YourScene />
 * </Canvas>
 * ```
 *
 * @example
 * ```tsx
 * // Force enable in production for debugging
 * <Canvas>
 *   <PerfMonitor enabled={true} logInterval={600} />
 *   <YourScene />
 * </Canvas>
 * ```
 */
export function PerfMonitor({
  enabled = process.env.NODE_ENV === 'development',
  logInterval = 300,
  onStats,
  leakThreshold = 10,
}: PerfMonitorProps) {
  const gl = useThree((state) => state.gl)
  const frameCountRef = useRef(0)
  const baselineRef = useRef<{ geometries: number; textures: number } | null>(
    null
  )

  useFrame(() => {
    if (!enabled) return

    frameCountRef.current++

    // Only capture/log stats at the specified interval
    if (frameCountRef.current % logInterval !== 0) return

    const { render, memory } = gl.info

    const stats: PerfStats = {
      calls: render.calls,
      triangles: render.triangles,
      geometries: memory.geometries,
      textures: memory.textures,
      timestamp: Date.now(),
    }

    // Set baseline on first capture
    if (!baselineRef.current) {
      baselineRef.current = {
        geometries: stats.geometries,
        textures: stats.textures,
      }
    }

    // Check for potential memory leaks
    const geometryDelta = stats.geometries - baselineRef.current.geometries
    const textureDelta = stats.textures - baselineRef.current.textures

    if (geometryDelta > leakThreshold || textureDelta > leakThreshold) {
      console.warn(
        '[PerfMonitor] Potential memory leak detected!\n' +
          `Geometries: ${baselineRef.current.geometries} -> ${stats.geometries} (+${geometryDelta})\n` +
          `Textures: ${baselineRef.current.textures} -> ${stats.textures} (+${textureDelta})\n` +
          'Consider using useDisposable() hook or disposeObject() for cleanup.'
      )
    }

    // Log stats
    if (process.env.NODE_ENV === 'development') {
      console.debug(
        '[PerfMonitor] Stats:',
        `Calls: ${stats.calls}`,
        `| Triangles: ${stats.triangles.toLocaleString()}`,
        `| Geometries: ${stats.geometries}`,
        `| Textures: ${stats.textures}`
      )
    }

    // Call custom handler
    onStats?.(stats)
  })

  return null
}

/**
 * Hook to access renderer stats on demand.
 *
 * @example
 * ```tsx
 * function DebugPanel() {
 *   const getStats = usePerfStats()
 *
 *   return (
 *     <button onClick={() => console.log(getStats())}>
 *       Log Stats
 *     </button>
 *   )
 * }
 * ```
 *
 * @returns Function that returns current PerfStats
 */
export function usePerfStats(): () => PerfStats {
  const gl = useThree((state) => state.gl)

  return () => {
    const { render, memory } = gl.info
    return {
      calls: render.calls,
      triangles: render.triangles,
      geometries: memory.geometries,
      textures: memory.textures,
      timestamp: Date.now(),
    }
  }
}
