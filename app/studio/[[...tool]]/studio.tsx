'use client'

import { NextStudio } from 'next-sanity/studio'
import { notFound } from 'next/navigation'

import config from '@/integrations/sanity/sanity.config'

// `config` is `null` when Sanity isn't configured (no projectId) —
// `sanity.config.ts` guards `defineConfig` behind `isConfigured('sanity')`.
// The page 404s on that same predicate first, so this is a backstop rather
// than the gate. It stays because the two are evaluated against different
// envs: the page reads process.env at request time, this file reads
// NEXT_PUBLIC_* values inlined at build time. In the browser that means a
// build with no Sanity vars can still reach here, and a 404 beats a blank
// page.
export function Studio() {
  if (!config) {
    notFound()
  }

  return <NextStudio config={config} />
}
