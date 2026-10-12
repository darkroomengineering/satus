'use client'

import { NextStudio } from 'next-sanity/studio'
import { notFound } from 'next/navigation'

import config from '@/integrations/sanity/sanity.config'

// `config` is `null` when Sanity isn't configured (no projectId) —
// `sanity.config.ts` guards `defineConfig` behind `isConfigured('sanity')`.
// The page 404s on that same predicate first, so this is a backstop rather
// than the gate. It stays because the two can still see different values:
// the page is prerendered from the server's process.env, this file reads
// only NEXT_PUBLIC_* values inlined into the browser bundle. A project id set
// only through the SANITY_STUDIO_PROJECT_ID alias passes the page and reaches
// here with a null config, and a 404 beats a blank page.
export function Studio() {
  if (!config) {
    notFound()
  }

  return <NextStudio config={config} />
}
