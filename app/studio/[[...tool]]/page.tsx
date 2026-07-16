'use client'

import { notFound } from 'next/navigation'
import { NextStudio } from 'next-sanity/studio'
import config from '@/integrations/sanity/sanity.config'

// `config` is `null` when Sanity isn't configured (no projectId) —
// `sanity.config.ts` guards `defineConfig` behind `isConfigured('sanity')`
// so this branch never mounts a Studio with an invalid config. Note: the
// classic `export const dynamic = ...` route segment config is not
// supported here — this project runs Next's Cache Components, which
// forbids it.
export default function StudioPage() {
  if (!config) {
    notFound()
  }

  return <NextStudio config={config} />
}
