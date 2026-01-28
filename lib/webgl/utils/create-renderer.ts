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

export type RendererResult = {
  renderer: WebGLRenderer
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
    precision = 'highp',
    stencil = false,
    depth = true,
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

      console.info('🚀 Using WebGPU renderer')

      return {
        renderer: renderer as unknown as WebGLRenderer,
        type: 'webgpu',
        isWebGPU: true,
      }
    } catch (error) {
      console.warn('WebGPU renderer failed, falling back to WebGL:', error)
    }
  }

  // Fall back to WebGL
  const { WebGLRenderer } = await import('three')

  const renderer = new WebGLRenderer({
    canvas,
    alpha,
    antialias: antialias && capability.dpr < 2,
    powerPreference,
    precision,
    stencil,
    depth,
  })

  console.info('🎮 Using WebGL renderer')

  return {
    renderer,
    type: 'webgl',
    isWebGPU: false,
  }
}

/**
 * Create a WebGL-only renderer (skip WebGPU attempt).
 *
 * Use this when you know you want WebGL, or for compatibility.
 */
export async function createWebGLRenderer(
  options: CreateRendererOptions
): Promise<RendererResult> {
  const {
    canvas,
    alpha = true,
    antialias = true,
    powerPreference = 'high-performance',
    precision = 'highp',
    stencil = false,
    depth = true,
  } = options

  const capability = detectGPUCapability()
  const { WebGLRenderer } = await import('three')

  const renderer = new WebGLRenderer({
    canvas,
    alpha,
    antialias: antialias && capability.dpr < 2,
    powerPreference,
    precision,
    stencil,
    depth,
  })

  return {
    renderer,
    type: 'webgl',
    isWebGPU: false,
  }
}
