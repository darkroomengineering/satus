'use client'

import { NextStudio } from 'next-sanity/studio'
import { notFound } from 'next/navigation'

import config from '@/integrations/sanity/sanity.config'

// `config` is `null` when Sanity isn't configured (no projectId) —
// `sanity.config.ts` guards `defineConfig` behind `isConfigured('sanity')`
// so this branch never mounts a Studio with an invalid config.
export function Studio() {
  if (!config) {
    notFound()
  }

  return <NextStudio config={config} />
}
