'use client'

import { VisualEditing } from 'next-sanity/visual-editing'
import { useRouter } from 'next/navigation'

/**
 * Presentation overlays and live preview for draft mode. Render it only
 * while draft mode is on.
 *
 * There is no Sanity Live, so nothing else refreshes the page when an editor
 * changes a field: next-sanity's default handler ignores those mutation
 * events. `router.refresh()` re-runs the Server Components, and `sanityFetch`
 * reads the new draft uncached.
 */
export function SanityVisualEditing() {
  const router = useRouter()

  return (
    <VisualEditing
      refresh={() => {
        router.refresh()
        return Promise.resolve()
      }}
    />
  )
}
