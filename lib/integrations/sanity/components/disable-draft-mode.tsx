'use client'

import { lazy, Suspense } from 'react'

// Behind lazy() because `useVisualEditingEnvironment` pulls @sanity/ui,
// styled-components and motion (~230 KB gzip). Next ships every client module
// a layout imports whether or not it renders, so a static import would put
// that on /sanity's first load for every visitor, not just draft mode.
const Pill = lazy(() =>
  import('./disable-draft-mode-pill').then((mod) => ({
    default: mod.DisableDraftModePill,
  }))
)

export function DisableDraftMode() {
  return (
    <Suspense fallback={null}>
      <Pill />
    </Suspense>
  )
}
