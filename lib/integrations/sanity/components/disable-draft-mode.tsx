'use client'

import { useVisualEditingEnvironment } from 'next-sanity/hooks'
import { usePathname } from 'next/navigation'

import { Link } from '@/components/ui/link'

export function DisableDraftMode() {
  const environment = useVisualEditingEnvironment()
  const pathname = usePathname()

  // Hide the disable draft mode button when inside the Presentation tool (it owns its own controls there).
  if (
    environment === 'presentation-iframe' ||
    environment === 'presentation-window'
  ) {
    return null
  }

  if (pathname.startsWith('/studio')) {
    return null
  }

  return (
    <Link
      href="/api/draft-mode/disable"
      scroll={false}
      className="text-sm fixed top-safe right-safe z-50 bg-red dr-p-4 font-mono text-primary uppercase"
    >
      Disable Draft Mode
    </Link>
  )
}
