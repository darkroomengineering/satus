'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function DisableDraftMode() {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  // Don't show when in Sanity Studio
  if (pathname.startsWith('/studio')) {
    return null
  }

  const disable = () =>
    startTransition(async () => {
      await fetch('/api/disable-draft')
      router.refresh()
    })

  return (
    <div className="fixed right-safe top-safe bg-blue-500 text-primary uppercase px-4 py-2 rounded font-mono text-sm z-50">
      {pending ? (
        'Disabling draft mode...'
      ) : (
        <button type="button" onClick={disable}>
          Disable draft mode
        </button>
      )}
    </div>
  )
}
