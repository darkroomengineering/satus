'use client'

import { useDraftModeEnvironment } from 'next-sanity/hooks'
import { Link } from '~/components/link'

export function DisableDraftMode() {
  const environment = useDraftModeEnvironment()

  // Only show the disable draft mode button when outside of Presentation Tool
  if (environment !== 'live' && environment !== 'unknown') {
    return null
  }

  return (
    <Link
      href="/api/draft-mode/disable"
      className="fixed right-safe top-safe bg-blue-500 text-primary uppercase px-4 py-2 rounded font-mono text-sm z-50"
    >
      Disable Draft Mode
    </Link>
  )
}
