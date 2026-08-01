import { connection } from 'next/server'

import { Studio } from './studio'

// Defer Studio to request time: /studio sits outside the (app) group, so its
// tree no longer reads any dynamic API — without this, Cache Components would
// try to fully prerender NextStudio at build time, which crashes. The classic
// `export const dynamic = ...` segment config is forbidden under Cache
// Components; awaiting `connection()` is its replacement.
export default async function StudioPage() {
  await connection()
  return <Studio />
}
