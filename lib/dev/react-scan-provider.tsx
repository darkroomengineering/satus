'use client'

import { useEffect } from 'react'
import { scan } from 'react-scan'

// react-scan's shadow host on <html>: hide it, never remove it. A module-level
// guard inside react-scan blocks re-creation on re-enable.
const REACT_SCAN_ROOT_ID = 'react-scan-root'

/**
 * react-scan render profiler, mounted only when the Orchestra `reactScan`
 * toggle is on (it instruments every React commit). react-scan has no
 * `stop()`: mount enables and shows, unmount disables and hides.
 */
export function ReactScanProvider() {
  useEffect(() => {
    scan({
      enabled: true,
      animationSpeed: 'fast',
      trackUnnecessaryRenders: true,
    })
    document.getElementById(REACT_SCAN_ROOT_ID)?.style.removeProperty('display')

    return () => {
      scan({ enabled: false })
      document
        .getElementById(REACT_SCAN_ROOT_ID)
        ?.style.setProperty('display', 'none')
    }
  }, [])

  return null
}
