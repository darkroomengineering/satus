'use client'

import { NextStudio } from 'next-sanity/studio'
import { notFound } from 'next/navigation'

import config from '@/integrations/sanity/sanity.config'

// `config` is `null` when Sanity isn't configured. The page 404s on the same
// predicate first, so this is a backstop, but the two can see different
// values: the page reads the server's process.env, this file only the
// NEXT_PUBLIC_* values inlined into the browser bundle. A project id set only
// through the SANITY_STUDIO_PROJECT_ID alias passes the page and reaches here
// with a null config; a 404 beats a blank page.
export function Studio() {
  if (!config) {
    notFound()
  }

  return <NextStudio config={config} />
}
