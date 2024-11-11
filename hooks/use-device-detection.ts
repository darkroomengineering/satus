import { useMediaQuery } from '@darkroom.engineering/hamo'
<<<<<<< HEAD:hooks/use-device-detection.ts
import { breakpoints } from '~/styles/config.mjs'
=======
import { useOrchestra } from 'libs/orchestra/react'
import variables from 'styles/config.js'
>>>>>>> main:hooks/use-device-detection.js

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
