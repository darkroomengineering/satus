'use client'

import dynamic from 'next/dynamic'

const DevControlsPanel = dynamic(
  () => import('./panel').then(({ DevControlsPanel }) => DevControlsPanel),
  { ssr: false }
)

/** Dev-only mipmap switch and canvas DPR readout; the panel chunk is never requested in production. */
export function DevControls() {
  if (process.env.NODE_ENV !== 'development') return null

  return <DevControlsPanel />
}
