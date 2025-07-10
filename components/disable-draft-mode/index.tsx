'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function DisableDraftMode() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Don't show in iframes (when embedded in Sanity Studio)
  if (
    typeof window !== 'undefined' &&
    (window !== window.parent || !!window.opener)
  ) {
    return null
  }

  const disable = () =>
    startTransition(async () => {
      await fetch('/api/disable-draft')
      router.refresh()
    })

  return (
    <div className="fixed bottom-4 left-4 bg-blue-500 text-white px-4 py-2 rounded font-mono text-sm z-50">
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
