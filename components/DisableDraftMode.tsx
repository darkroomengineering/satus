'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { disableDraftMode } from '~/app/actions'

export function DisableDraftMode() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (
    typeof window !== 'undefined' &&
    (window !== window.parent || !!window.opener)
  ) {
    return null
  }

  const disable = () =>
    startTransition(async () => {
      await disableDraftMode()
      router.refresh()
    })

  return (
    <div className="fixed bottom-4 left-4 bg-blue-500 text-white px-4 py-2 rounded font-mono text-sm">
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
