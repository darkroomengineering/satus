'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDraftModeEnvironment } from 'next-sanity/hooks'

export function DisableDraftMode() {
  const environment = useDraftModeEnvironment()
  const pathname = usePathname()

  // Only show the disable draft mode button when outside of Presentation Tool
  if (environment !== 'live' && environment !== 'unknown') {
    return null
  }

  if (pathname.startsWith('/studio')) {
    return null
  }

  return (
    <Link
      href="/api/draft-mode/disable"
      scroll={false}
      className="fixed right-safe top-safe bg-red text-primary uppercase dr-p-4 font-mono text-sm z-50"
    >
      Disable Draft Mode
    </Link>
  )
}
