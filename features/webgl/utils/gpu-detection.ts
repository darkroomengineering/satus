/**
 * GPU Capability Detection
 *
 * Runtime detection for WebGPU and WebGL support.
 * Used to determine the best renderer and whether to enable 3D features.
 */

export type GPUCapability = {
  /** WebGPU is available and working */
  hasWebGPU: boolean
  /** WebGL 2 is available */
  hasWebGL2: boolean
  /** WebGL 1 is available (fallback) */
  hasWebGL1: boolean
  /** Any GPU rendering is available */
  hasGPU: boolean
  /** The best available renderer type */
  preferredRenderer: 'webgpu' | 'webgl2' | 'webgl1' | 'none'
  /** Device pixel ratio (capped at 2 for performance) */
  dpr: number
  /** Whether device is likely low-power (touch + no hover) */
  isLowPower: boolean
}

let cachedCapability: GPUCapability | null = null

/**
 * Detect GPU capabilities at runtime.
 *
 * Results are cached after first call.
 *
 * @example
 * ```tsx
 * const { hasWebGPU, preferredRenderer } = detectGPUCapability()
 *
 * if (preferredRenderer === 'none') {
 *   return <FallbackUI />
 * }
 * ```
 */
export function detectGPUCapability(): GPUCapability {
  // Return cached result if available
  if (cachedCapability) {
    return cachedCapability
  }

  // Server-side fallback
  if (typeof window === 'undefined') {
    return {
      hasWebGPU: false,
      hasWebGL2: false,
      hasWebGL1: false,
      hasGPU: false,
      preferredRenderer: 'none',
      dpr: 1,
      isLowPower: false,
    }
  }

  // Detect WebGPU
  const hasWebGPU = 'gpu' in navigator

  // Detect WebGL 2
  let hasWebGL2 = false
  try {
    const canvas = document.createElement('canvas')
    hasWebGL2 = !!canvas.getContext('webgl2')
  } catch {
    hasWebGL2 = false
  }

  // Detect WebGL 1
  let hasWebGL1 = false
  try {
    const canvas = document.createElement('canvas')
    hasWebGL1 = !!(
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    )
  } catch {
    hasWebGL1 = false
  }

  // Determine preferred renderer
  let preferredRenderer: GPUCapability['preferredRenderer'] = 'none'
  if (hasWebGPU) {
    preferredRenderer = 'webgpu'
  } else if (hasWebGL2) {
    preferredRenderer = 'webgl2'
  } else if (hasWebGL1) {
    preferredRenderer = 'webgl1'
  }

  // Device characteristics
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const isLowPower = window.matchMedia(
    '(any-pointer: coarse) and (hover: none)'
  ).matches

  cachedCapability = {
    hasWebGPU,
    hasWebGL2,
    hasWebGL1,
    hasGPU: hasWebGPU || hasWebGL2 || hasWebGL1,
    preferredRenderer,
    dpr,
    isLowPower,
  }

  return cachedCapability
}

/**
 * Check if WebGPU is available (synchronous check).
 *
 * Note: This only checks if the API exists, not if it's fully functional.
 * Use `initWebGPU()` for full initialization.
 */
export function isWebGPUAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return 'gpu' in navigator
}

/**
 * Check if any GPU rendering is available.
 */
export function isGPUAvailable(): boolean {
  return detectGPUCapability().hasGPU
}

/**
 * Initialize WebGPU adapter and device.
 *
 * Returns null if WebGPU is not available or initialization fails.
 *
 * @example
 * ```tsx
 * const gpu = await initWebGPU()
 * if (gpu) {
 *   // Use WebGPU
 * } else {
 *   // Fall back to WebGL
 * }
 * ```
 */
export async function initWebGPU(): Promise<{
  adapter: GPUAdapter
  device: GPUDevice
} | null> {
  if (!isWebGPUAvailable()) {
    return null
  }

  try {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      console.warn('WebGPU: No adapter found, falling back to WebGL')
      return null
    }

    const device = await adapter.requestDevice()
    return { adapter, device }
  } catch (error) {
    console.warn('WebGPU initialization failed, falling back to WebGL:', error)
    return null
  }
}
