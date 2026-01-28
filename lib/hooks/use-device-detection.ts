import { useMediaQuery } from 'hamo'
import { useEffect, useState } from 'react'
import { breakpoints } from '@/styles/config'
import {
  detectGPUCapability,
  type GPUCapability,
} from '@/webgl/utils/gpu-detection'
import { usePreferredReducedMotion } from './use-sync-external'

/**
 * Hook for detecting device capabilities and characteristics.
 *
 * Provides comprehensive device detection including screen size, input methods,
 * performance preferences, and GPU capabilities. Useful for responsive design,
 * performance optimization, and feature detection.
 *
 * @returns Object with device detection results
 *
 * @example
 * ```tsx
 * import { useDeviceDetection } from '@/hooks/use-device-detection'
 *
 * function ResponsiveComponent() {
 *   const {
 *     isMobile,
 *     isDesktop,
 *     isReducedMotion,
 *     hasGPU,
 *     gpuCapability,
 *     isLowPowerMode,
 *     dpr,
 *     isSafari
 *   } = useDeviceDetection()
 *
 *   // Adapt behavior based on device capabilities
 *   if (isReducedMotion) {
 *     // Disable animations
 *   }
 *
 *   if (hasGPU && !isLowPowerMode) {
 *     // Enable GPU features
 *   }
 *
 *   return (
 *     <div>
 *       {isMobile ? <MobileLayout /> : <DesktopLayout />}
 *       {isSafari && <SafariSpecificStyles />}
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Performance optimizations
 * const { isLowPowerMode, dpr, isReducedMotion, gpuCapability } = useDeviceDetection()
 *
 * // Reduce quality on low-power devices
 * const quality = isLowPowerMode ? 'low' : 'high'
 * const pixelRatio = Math.min(dpr || 1, 2) // Cap DPR
 *
 * // Respect user motion preferences
 * const enableAnimations = !isReducedMotion
 *
 * // Check renderer type
 * console.log('Preferred renderer:', gpuCapability.preferredRenderer)
 * ```
 */
export function useDeviceDetection() {
  const breakpoint = breakpoints.dt

  const isMobile = useMediaQuery(`(max-width: ${breakpoint - 1}px)`)
  const isDesktop = useMediaQuery(`(min-width: ${breakpoint}px)`)
  const isReducedMotion = usePreferredReducedMotion()

  const [gpuCapability, setGpuCapability] = useState<GPUCapability>(() => ({
    hasWebGPU: false,
    hasWebGL2: false,
    hasWebGL1: false,
    hasGPU: false,
    preferredRenderer: 'none',
    dpr: 1,
    isLowPower: false,
  }))

  const [isSafari, setIsSafari] = useState<boolean | undefined>(undefined)

  // Check for low power mode with fallback for unsupported browsers
  const isLowPowerMode = useMediaQuery(
    '(any-pointer: coarse) and (hover: none)'
  )

  useEffect(() => {
    // Detect GPU capabilities at runtime
    const capability = detectGPUCapability()
    setGpuCapability(capability)

    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent))
  }, [])

  // GPU is available if device has capability AND is not in low-power mode
  const hasGPU = gpuCapability.hasGPU && !isLowPowerMode

  return {
    // Screen size
    isMobile,
    isDesktop,

    // Accessibility
    isReducedMotion,

    // GPU capabilities (replaces old isWebGL)
    hasGPU,
    hasWebGPU: gpuCapability.hasWebGPU,
    hasWebGL: gpuCapability.hasWebGL2 || gpuCapability.hasWebGL1,
    gpuCapability,

    // Legacy alias (deprecated, use hasGPU instead)
    /** @deprecated Use `hasGPU` instead */
    isWebGL: hasGPU,

    // Performance
    isLowPowerMode,
    dpr: gpuCapability.dpr,

    // Browser
    isSafari,
  }
}
