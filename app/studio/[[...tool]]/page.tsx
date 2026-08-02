import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { isConfigured } from '@/lib/integrations/registry'

import { Studio } from './studio'

// Defer Studio to request time: /studio sits outside the (site) group, so its
// tree no longer reads any dynamic API — without this, Cache Components would
// try to fully prerender NextStudio at build time, which crashes. The classic
// `export const dynamic = ...` segment config is forbidden under Cache
// Components; awaiting `connection()` is its replacement.
export default async function StudioPage() {
  // Unconfigured forks 404 here, server-side, before <Studio /> is ever
  // rendered — so the Studio client bundle is never referenced or shipped.
  if (!isConfigured('sanity')) notFound()

  await connection()
  return <Studio />
}
