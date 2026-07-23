import { connection } from 'next/server'
import { Wrapper } from '@/components/layout/wrapper'
import { Link } from '@/components/ui/link'

export const metadata = {
  title: 'Dynamic route — Instant Navigations demo',
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ item: string }>
}) {
  const { item } = await params
  await connection()
  await new Promise((resolve) => setTimeout(resolve, 1200))

  return (
    <Wrapper theme="dark">
      <section className="dr-layout-grid min-h-dvh content-center py-24 font-mono">
        <div className="col-span-full dt:col-start-2 dt:col-end-11 flex flex-col gap-6">
          <h1 className="text-2xl uppercase">Dynamic route: {item}</h1>
          <p className="max-w-prose opacity-70">
            One reusable shell is prefetched for this route and shown on the way
            in (see the skeleton). It is identical for every param value —{' '}
            <code>alpha</code>, <code>bravo</code>, and <code>charlie</code>.
          </p>
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
