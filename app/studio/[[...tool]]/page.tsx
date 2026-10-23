import type { Metadata } from 'next'
import { metadata as studioMetadata } from 'next-sanity/studio'
import { notFound } from 'next/navigation'

import { dataset, projectId } from '@/integrations/sanity/env'

import { Studio } from './studio'

// next-sanity's defaults (a same-origin referrer, `viewport-fit=cover`).
// `robots` is spelled out because `app/robots.ts` allows `/` to every bot.
export const metadata: Metadata = {
  ...studioMetadata,
  title: 'Sanity Studio',
  robots: { index: false, follow: false },
}
export { viewport } from 'next-sanity/studio'

// Prerendered as next-sanity recommends. Deeper Studio paths would each render
// and cache their own copy; the `/studio/:path+` rewrite in next.config.ts
// sends them all to this page. Cost: the configured check below runs once per
// build, so turning Sanity on or off takes a rebuild (as it does for the
// browser side, where `sanity.config.ts` sees only inlined NEXT_PUBLIC_*).
export const dynamic = 'force-static'

export default function StudioPage() {
  // Decides on the server, before the client reference is emitted, so an
  // unconfigured project never mounts Studio. Must stay the same
  // `projectId && dataset` condition sanity.config.ts gates on, read from the
  // same module: any other predicate can pass here and meet a null config
  // there.
  if (!projectId || !dataset) {
    notFound()
  }

  return <Studio />
}
