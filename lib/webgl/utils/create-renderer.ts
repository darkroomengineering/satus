/**
 * WebGPU/WebGL Renderer Factory
 *
 * Creates the best available renderer with automatic fallback:
 * WebGPU -> WebGL 2 -> WebGL 1
 *
 * Note: three.js WebGPURenderer automatically falls back to WebGL
 * when WebGPU is not available, but we handle it explicitly for
 * better error handling and logging.
 */

import type { WebGLRenderer } from 'three'
import { detectGPUCapability, isWebGPUAvailable } from './gpu-detection'

export type RendererType = 'webgpu' | 'webgl'

export type CreateRendererOptions = {
  canvas: HTMLCanvasElement
  alpha?: boolean
  antialias?: boolean
  powerPreference?: 'high-performance' | 'low-power'
  precision?: 'highp' | 'mediump' | 'lowp'
  stencil?: boolean
  depth?: boolean
  /** Force WebGL renderer (skip WebGPU). Defaults to false. */
  forceWebGL?: boolean
}

/**
 * The renderer returned is always a WebGPURenderer instance (which implements
 * the WebGL2 backend when WebGPU is unavailable). R3F's Canvas `gl` prop is
 * typed as WebGLRenderer, so we cast at the boundary — the single commented
 * cast below is intentional. Callers inside lib/webgl must use WebGPURenderer
 * or this union type and avoid WebGL-only properties like `capabilities.isWebGL2`.
 */
export type RendererInstance = WebGLRenderer // r3f boundary type (see cast below)

export type RendererResult = {
  /** The renderer — cast to WebGLRenderer for R3F compatibility at the boundary. */
  renderer: RendererInstance
  type: RendererType
  isWebGPU: boolean
}

/**
 * Create the best available renderer for the current device.
 *
 * Attempts WebGPU first, falls back to WebGL if unavailable.
 * Returns a promise that resolves to the renderer and its type.
 *
 * @example
 * ```tsx
 * // In R3F Canvas gl prop
 * <Canvas
 *   gl={async (canvas) => {
 *     const { renderer } = await createRenderer({ canvas })
 *     return renderer
 *   }}
 * >
 * ```
 */
export async function createRenderer(
  options: CreateRendererOptions
): Promise<RendererResult> {
  const {
    canvas,
    alpha = true,
    antialias = true,
    powerPreference = 'high-performance',
    forceWebGL = false,
  } = options

  const capability = detectGPUCapability()

  // Try WebGPU first (unless forced to WebGL)
  if (!forceWebGL && isWebGPUAvailable() && !capability.isLowPower) {
    try {
      // Dynamic import to avoid loading WebGPU code if not needed
      const { WebGPURenderer } = await import('three/webgpu')

      const renderer = new WebGPURenderer({
        canvas,
        alpha,
        antialias: antialias && capability.dpr < 2,
        powerPreference,
        // WebGPURenderer-specific options
        forceWebGL: false,
      })

      // WebGPURenderer requires async initialization
      await renderer.init()

      if (process.env.NODE_ENV === 'development') {
        console.info('Using WebGPU renderer')
      }

      return {
        // Cast is intentional: R3F types expect WebGLRenderer at this boundary.
        // WebGPURenderer is a superset; the cast is safe for R3F's usage.
        renderer: renderer as unknown as WebGLRenderer,
        type: 'webgpu',
        isWebGPU: true,
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('WebGPU renderer failed, falling back to WebGL:', error)
      }
    }
  }

  // Fall back to WebGPURenderer's WebGL2 backend (forceWebGL) — NOT the classic
  // THREE.WebGLRenderer. All effects are TSL NodeMaterials, which only the
  // WebGPURenderer pipeline can compile; the classic renderer produces an
  // undefined shader and throws every frame. The WebGL2 backend runs the same
  // NodeMaterials on browsers without WebGPU (e.g. privacy/Chromium forks) and
  // on low-power devices.
  const { WebGPURenderer } = await import('three/webgpu')

  const renderer = new WebGPURenderer({
    canvas,
    alpha,
    antialias: antialias && capability.dpr < 2,
    powerPreference,
    forceWebGL: true,
  })

  await renderer.init()

  if (process.env.NODE_ENV === 'development') {
    console.info('Using WebGPU renderer (WebGL2 backend)')
  }

  return {
    // Cast is intentional: R3F types expect WebGLRenderer at this boundary.
    // WebGPURenderer is a superset; the cast is safe for R3F's usage.
    renderer: renderer as unknown as WebGLRenderer,
    type: 'webgl',
    isWebGPU: false,
  }
}
