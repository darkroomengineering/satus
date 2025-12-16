import { useMediaQuery } from 'hamo'
import { useEffect, useState } from 'react'
import { breakpoints } from '~/styles/config'

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
