import { connection } from 'next/server'
import { Suspense } from 'react'

import { Wrapper } from '@/components/layout/wrapper'
import { Link } from '@/components/ui/link'

export const metadata = {
  title: 'Slow route — Instant Navigations demo',
}

// connection() marks this subtree runtime-dynamic; the artificial delay makes
// the stream visible. Lives inside <Suspense> so the page shell paints
// immediately and only this panel streams in (partial prerendering under
// cacheComponents).
async function StreamedPanel() {
  await connection()
  await new Promise((resolve) => setTimeout(resolve, 1500))
  return (
    <p className="max-w-prose opacity-90">
      Streamed in after ~1.5s. The heading and back-link above were already on
      screen — only this panel waited on the server.
    </p>
  )
}

function PanelSkeleton() {
  return (
    // `block` is required: <output> is inline by default, and `w-40` would do
    // nothing on an inline element. The implicit role="status" replaces the
    // explicit one.
    <output aria-busy="true" className="w-40 block">
      <span className="sr-only">Loading panel</span>
      <div aria-hidden className="animate-pulse space-y-2">
        <div className="h-2 rounded bg-current opacity-20" />
        <div className="h-2 rounded w-3/4 bg-current opacity-20" />
        <div className="h-2 rounded w-1/2 bg-current opacity-10" />
      </div>
    </output>
  )
}

export default function SlowPage() {
  return (
    <Wrapper theme="dark">
      <section className="py-24 dr-layout-grid min-h-dvh content-center font-mono">
        <div className="gap-6 col-span-full flex flex-col dt:col-start-2 dt:col-end-11">
          <h1 className="text-2xl uppercase">Slow route</h1>
          <p className="max-w-prose opacity-70">
            The shell (this heading and the link below) paints instantly. The
            panel streams in once the server resolves.
          </p>
          <Suspense fallback={<PanelSkeleton />}>
            <StreamedPanel />
          </Suspense>
          <Link
            className="underline underline-offset-4"
            href="/instant-nav-demo"
          >
            ← Back to demo hub
          </Link>
        </div>
      </section>
    </Wrapper>
  )
}
