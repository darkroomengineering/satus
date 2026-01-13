'use client'

import { Link } from '@/components/ui/link'

export function LinkDemo() {
  return (
    <div className="flex flex-wrap gap-6">
      <Link href="/components" className="underline hover:opacity-70">
        Internal Link (uses next/link)
      </Link>
      <Link href="https://base-ui.com" className="underline hover:opacity-70">
        External Link (opens in new tab)
      </Link>
    </div>
  )
}
