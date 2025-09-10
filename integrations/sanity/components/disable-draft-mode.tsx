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
      className="fixed bottom-4 right-4 bg-gray-50 px-4 py-2"
    >
      Disable Draft Mode
    </Link>
  )
}
