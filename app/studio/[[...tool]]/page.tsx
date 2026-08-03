import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { dataset, projectId } from '@/integrations/sanity/env'

import { Studio } from './studio'

export default async function StudioPage() {
  // Defer Studio to request time: /studio sits outside the (site) group, so its
  // tree no longer reads any dynamic API — without this, Cache Components would
  // try to fully prerender NextStudio at build time, which crashes. The classic
  // `export const dynamic = ...` segment config is forbidden under Cache
  // Components; awaiting `connection()` is its replacement.
  await connection()

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
