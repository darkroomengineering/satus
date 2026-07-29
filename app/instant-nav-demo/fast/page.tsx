import { Wrapper } from '@/components/layout/wrapper'
import { Link } from '@/components/ui/link'

export const metadata = {
  title: 'Fast route — Instant Navigations demo',
}

export default function FastPage() {
  return (
    <Wrapper theme="dark">
      <section className="py-24 dr-layout-grid min-h-dvh content-center font-mono">
        <div className="gap-6 col-span-full flex flex-col dt:col-start-2 dt:col-end-11">
          <h1 className="text-2xl uppercase">Fast route</h1>
          <p className="max-w-prose opacity-70">
            Fully static — no async data. The prefetched shell IS the page, so
            navigation here is immediate with nothing to stream.
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
