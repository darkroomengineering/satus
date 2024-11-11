import { useMediaQuery } from '@darkroom.engineering/hamo'
import { useOrchestra } from '~/libs/orchestra/react'
import { breakpoints } from '~/styles/config.mjs'

export function useDeviceDetection() {
  const breakpoint = breakpoints.dt

  const { webgl } = useOrchestra()

  const isMobile = useMediaQuery(`(max-width: ${breakpoint - 1}px)`)
  const isDesktop = useMediaQuery(`(min-width: ${breakpoint}px)`)
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isWebGL = isDesktop && !isReducedMotion && webgl
  // TODO: const isLowPowerMode

  return { isMobile, isDesktop, isReducedMotion, isWebGL }
}
