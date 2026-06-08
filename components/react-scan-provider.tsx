'use client'

import { useEffect } from 'react'
import { scan } from 'react-scan'

// react-scan injects this shadow-host element onto <html> the first time it
// starts. It is guarded by a module-level ref inside react-scan, so it can be
// hidden but must NOT be removed (removal blocks re-creation on re-enable).
const REACT_SCAN_ROOT_ID = 'react-scan-root'

/**
 * react-scan render profiler, mounted only when the 🔬 Orchestra toggle
 * (`id="reactScan"`, ⌘O palette) is on — off by default, so a normal dev
 * session pays no profiler cost (react-scan instruments every React commit).
 *
 * react-scan exposes no `stop()`, so teardown is manual: enabling + showing on
 * mount, disabling + hiding on unmount. `enabled` gates the expensive
 * per-commit work; hiding the shadow host removes the panel without tripping
 * react-scan's "created once" guard.
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
