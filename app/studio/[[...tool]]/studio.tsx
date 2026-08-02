'use client'

import { NextStudio } from 'next-sanity/studio'
import { notFound } from 'next/navigation'

import config from '@/integrations/sanity/sanity.config'

// `config` is `null` when Sanity isn't configured (no projectId) —
// `sanity.config.ts` guards `defineConfig` behind `isConfigured('sanity')`.
// The server page (./page.tsx) already 404s before rendering this component
// when Sanity is unconfigured; this branch narrows the type and keeps the
// invalid-config path impossible even if that guard moves.
export function Studio() {
  if (!config) {
    notFound()
  }

  return <NextStudio config={config} />
}
