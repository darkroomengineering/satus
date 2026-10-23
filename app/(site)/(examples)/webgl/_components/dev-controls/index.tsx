'use client'

import dynamic from 'next/dynamic'

const DevControlsPanel = dynamic(
  () => import('./panel').then(({ DevControlsPanel }) => DevControlsPanel),
  { ssr: false }
)

/**
 * Development-only controls for the mipmap test: a mipmap switch and a
 * canvas DPR readout. Renders nothing in production, and the panel's chunk
 * is never requested there.
 */
export function DevControls() {
  if (process.env.NODE_ENV !== 'development') return null

  return <DevControlsPanel />
}
