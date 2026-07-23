import { Wrapper } from '@/components/layout/wrapper'
import { Link } from '@/components/ui/link'

export const metadata = {
  title: 'Instant Navigations demo',
}

const ITEMS = ['alpha', 'bravo', 'charlie']

export default function InstantNavDemoPage() {
  return (
    <Wrapper theme="dark">
      <section className="dr-layout-grid min-h-dvh content-center py-24 font-mono">
        <div className="col-span-full dt:col-start-2 dt:col-end-11 flex flex-col gap-6">
          <h1 className="text-2xl uppercase">Instant Navigations demo</h1>
          <p className="max-w-prose opacity-70">
            Throwaway routes for exercising Next.js 16.3 shell-based
            prefetching. Hover a link to prefetch its shell, then click to see
            the shell paint instantly while data streams in.
          </p>

          <nav className="flex flex-col gap-3">
            <Link
              className="underline underline-offset-4"
              href="/instant-nav-demo/fast"
            >
              → Fast route (synchronous, paints immediately)
            </Link>
            <Link
              className="underline underline-offset-4"
              href="/instant-nav-demo/slow"
            >
              → Slow route (shell first, panel streams in)
            </Link>
            {ITEMS.map((item) => (
              <Link
                key={item}
                className="underline underline-offset-4"
                href={`/instant-nav-demo/${item}`}
              >
                → Dynamic route: {item} (one shell, reused per param)
              </Link>
            ))}
          </nav>

          <Link className="underline underline-offset-4 opacity-60" href="/">
            ← Home
          </Link>
        </div>
      </section>
    </Wrapper>
  )
}
