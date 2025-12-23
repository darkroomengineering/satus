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
      className="dr-p-4 fixed top-safe right-safe z-50 bg-red font-mono text-primary text-sm uppercase"
    >
      Disable Draft Mode
    </Link>
  )
}
