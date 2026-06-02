'use client'

import { useScan } from 'react-scan'

export function ReactScanProvider() {
  useScan({
    enabled: process.env.NODE_ENV === 'development',
    animationSpeed: 'fast',
    trackUnnecessaryRenders: true,
  })

  return null
}
