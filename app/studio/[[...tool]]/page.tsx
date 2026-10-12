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

// Prerender `/studio` at build time. Under Cache Components this is the
// replacement for `export const dynamic = 'force-static'`, which is a build
// error here. Deeper Studio paths (`/studio/structure/...`) would each render
// and cache their own copy on first request; the `/studio/:path+` rewrite in
// next.config.ts sends them all to this one prerendered page instead. Cost: the
// configured check below runs once per build, not per request, so turning
// Sanity on or off takes a rebuild. It always did for the browser side, since
// `sanity.config.ts` sees only the NEXT_PUBLIC_* values inlined at build time.
export function generateStaticParams() {
  return [{ tool: [] }]
}

export default function StudioPage() {
  // 404 here rather than inside <Studio />: this decides on the server, before
  // the client reference is emitted, so an unconfigured project never mounts
  // the Studio at all. Deliberately the same `projectId && dataset` condition
  // sanity.config.ts gates on, read from the same module — any other predicate
  // can disagree with it and strand the route between a pass here and a null
  // config there.
  if (!projectId || !dataset) {
    notFound()
  }

  return <Studio />
}
