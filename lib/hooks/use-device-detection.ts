import { useMediaQuery } from 'hamo'
import { useEffect, useState } from 'react'
import { breakpoints } from '@/styles/config'

/**
 * Hook for detecting device capabilities and characteristics.
 *
 * Provides comprehensive device detection including screen size, input methods,
 * performance preferences, and browser capabilities. Useful for responsive design,
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
 *     isWebGL,
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
 *   if (isWebGL && !isLowPowerMode) {
 *     // Enable WebGL features
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
 * const { isLowPowerMode, dpr, isReducedMotion } = useDeviceDetection()
 *
 * // Reduce quality on low-power devices
 * const quality = isLowPowerMode ? 'low' : 'high'
 * const pixelRatio = Math.min(dpr || 1, 2) // Cap DPR
 *
 * // Respect user motion preferences
 * const enableAnimations = !isReducedMotion
 * ```
 */
export function useDeviceDetection() {
  const breakpoint = breakpoints.dt

  const isMobile = useMediaQuery(`(max-width: ${breakpoint - 1}px)`)
  const isDesktop = useMediaQuery(`(min-width: ${breakpoint}px)`)
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isWebGL = isDesktop
  const [dpr, setDpr] = useState<number | undefined>(undefined)
  const [isSafari, setIsSafari] = useState<boolean | undefined>(undefined)

  // Check for low power mode with fallback for unsupported browsers
  const isLowPowerMode = useMediaQuery(
    '(any-pointer: coarse) and (hover: none)'
  )

  useEffect(() => {
    setDpr(window.devicePixelRatio)
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent))
  }, [])

  return {
    isMobile,
    isDesktop,
    isReducedMotion,
    isWebGL,
    isLowPowerMode,
    dpr,
    isSafari,
  }
}
