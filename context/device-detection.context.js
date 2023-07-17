'use client'

import { useMediaQuery } from '@studio-freight/hamo'
import variables from 'config/variables'
import { createContext, useContext } from 'react'

const DeviceDetectionContext = createContext({})

export function useDeviceDetection() {
  return useContext(DeviceDetectionContext)
}

export function DeviceDetectionProvider({ children }) {
  const breakpoint = Number(variables.breakpoints.mobile.replace('px', ''))

  const isMobile = useMediaQuery(`(max-width: ${breakpoint - 1}px)`)
  const isDesktop = useMediaQuery(`(min-width: ${breakpoint}px)`)
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isWebGL = isDesktop && !isReducedMotion
  // TODO: const isLowPowerMode

  return (
    <DeviceDetectionContext.Provider
      value={{ isMobile, isDesktop, isReducedMotion, isWebGL }}
    >
      {children}
    </DeviceDetectionContext.Provider>
  )
}
