import { useMediaQuery } from '@darkroom.engineering/hamo'
import { breakpoints } from '~/styles/config.mjs'

export function useDeviceDetection() {
  const breakpoint = breakpoints.dt

  const isMobile = useMediaQuery(`(max-width: ${breakpoint - 1}px)`)
  const isDesktop = useMediaQuery(`(min-width: ${breakpoint}px)`)
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isWebGL = isDesktop && !isReducedMotion
  // TODO: const isLowPowerMode

  return { isMobile, isDesktop, isReducedMotion, isWebGL }
}
