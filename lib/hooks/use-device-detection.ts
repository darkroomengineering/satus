import { useMediaQuery } from 'hamo'
import { useState } from 'react'
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
 *     isTouchOnly,
 *     dpr,
 *     isSafari
 *   } = useDeviceDetection()
 *
 *   // Adapt behavior based on device capabilities
 *   if (isReducedMotion) {
 *     // Disable animations
 *   }
 *
 *   if (hasGPU && !isTouchOnly) {
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
 * const { isTouchOnly, dpr, isReducedMotion, gpuCapability } = useDeviceDetection()
 *
 * // Reduce quality on touch-only devices
 * const quality = isTouchOnly ? 'low' : 'high'
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

  const [gpuCapability] = useState<GPUCapability>(() =>
    typeof window !== 'undefined'
      ? detectGPUCapability()
      : {
          hasWebGPU: false,
          hasWebGL2: false,
          hasWebGL1: false,
          hasGPU: false,
          preferredRenderer: 'none',
          dpr: 1,
          isLowPower: false,
        }
  )

  const [isSafari] = useState<boolean | undefined>(() =>
    typeof navigator !== 'undefined'
      ? /^(?<safariCheck>(?!chrome|android).)*safari/i.test(navigator.userAgent)
      : undefined
  )

  // Detects coarse-pointer / no-hover devices (touch-only, e.g. phones/tablets)
  const isTouchOnly = useMediaQuery('(any-pointer: coarse) and (hover: none)')

  // GPU is available if device has capability AND is not touch-only
  const hasGPU = gpuCapability.hasGPU && !isTouchOnly

  return {
    // Screen size
    isMobile,
    isDesktop,

    // Accessibility
    isReducedMotion,

    // GPU capabilities
    hasGPU,
    hasWebGPU: gpuCapability.hasWebGPU,
    hasWebGL: gpuCapability.hasWebGL2 || gpuCapability.hasWebGL1,
    gpuCapability,

    // Performance
    isTouchOnly,
    dpr: gpuCapability.dpr,

    // Browser
    isSafari,
  }
}
