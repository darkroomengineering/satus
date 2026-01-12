import { Wrapper } from '~/components/layout/wrapper'
import { Link } from '~/components/ui/link'
import { TransitionDemo } from './_components/transition-demo'

export const metadata = {
  title: 'Page Transitions',
  description: 'GSAP-powered page transitions demo',
}

export default function TransitionsPage() {
  return (
    <Wrapper theme="dark" className="font-mono">
      <section className="flex min-h-svh flex-col items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <h1 className="dr-text-32 dt:dr-text-48 dr-mb-16 font-bold">
            Page Transitions
          </h1>
          <p className="dr-mb-32 opacity-70">
            Click the links below to see different transition effects
          </p>
          <TransitionDemo />
        </div>
      </section>

      <section className="dr-py-64 dt:dr-py-100 border-white/10 border-t px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="dr-text-24 dt:dr-text-32 dr-mb-24 font-bold">
            Why GSAP-based transitions?
          </h2>

          <div className="dr-mb-32 space-y-6 text-sm leading-relaxed opacity-80">
            <p>
              This implementation uses GSAP for full creative control over page
              transitions, avoiding the limitations of the View Transitions API
              and libraries like{' '}
              <Link href="https://github.com/shuding/next-view-transitions">
                next-view-transitions
              </Link>
              .
            </p>

            <div className="dr-rounded-8 border border-white/10 bg-white/5 p-4">
              <h3 className="dr-mb-8 font-semibold">
                View Transitions API limitations
              </h3>
              <ul className="list-inside list-disc space-y-1 opacity-70">
                <li>Animates DOM snapshots, not live elements</li>
                <li>Limited to CSS animations (no physics, no GSAP plugins)</li>
                <li>Complex choreography requires verbose CSS</li>
                <li>Browser support still incomplete</li>
              </ul>
            </div>

            <div className="dr-rounded-8 border border-white/10 bg-white/5 p-4">
              <h3 className="dr-mb-8 font-semibold">
                next-view-transitions issues
              </h3>
              <ul className="list-inside list-disc space-y-1 opacity-70">
                <li>
                  Uses <code className="text-xs">flushSync</code> which blocks
                  the main thread
                </li>
                <li>Router freezes during transition</li>
                <li>Can cause jank on complex pages</li>
              </ul>
            </div>
          </div>

          <h2 className="dr-text-24 dt:dr-text-32 dr-mb-24 font-bold">
            This approach
          </h2>

          <div className="dr-mb-32 space-y-4 text-sm leading-relaxed opacity-80">
            <div className="dr-rounded-8 border border-green-500/30 bg-green-500/10 p-4">
              <h3 className="dr-mb-8 font-semibold text-green-400">Benefits</h3>
              <ul className="list-inside list-disc space-y-1">
                <li>Non-blocking: router stays responsive</li>
                <li>Full GSAP power: ScrollTrigger, physics, custom easing</li>
                <li>Animate actual DOM elements, not snapshots</li>
                <li>Easy choreography with GSAP timelines</li>
                <li>Works in all browsers</li>
                <li>Opt-in per-link with TransitionLink component</li>
              </ul>
            </div>
          </div>

          <h2 className="dr-text-18 dt:dr-text-24 dr-mb-16 font-bold">Usage</h2>

          <div className="space-y-4 text-sm">
            <div className="dr-rounded-8 overflow-hidden border border-white/10">
              <div className="border-white/10 border-b bg-white/5 px-4 py-2 text-xs opacity-50">
                .env.local
              </div>
              <pre className="overflow-x-auto p-4">
                <code>NEXT_PUBLIC_ENABLE_PAGE_TRANSITIONS=true</code>
              </pre>
            </div>

            <div className="dr-rounded-8 overflow-hidden border border-white/10">
              <div className="border-white/10 border-b bg-white/5 px-4 py-2 text-xs opacity-50">
                Component usage
              </div>
              <pre className="overflow-x-auto p-4">
                <code>{`import { TransitionLink } from '~/components/layout/page-transition'

<TransitionLink href="/about" exitType="slide-up">
  About Us
</TransitionLink>`}</code>
              </pre>
            </div>

            <div className="dr-rounded-8 overflow-hidden border border-white/10">
              <div className="border-white/10 border-b bg-white/5 px-4 py-2 text-xs opacity-50">
                Programmatic navigation
              </div>
              <pre className="overflow-x-auto p-4">
                <code>{`import { usePageTransition } from '~/components/layout/page-transition'

const { navigate } = usePageTransition()
navigate('/success', { exitType: 'fade', duration: 0.8 })`}</code>
              </pre>
            </div>
          </div>

          <p className="dr-mt-24 text-sm opacity-50">
            Available transition types: fade, slide-left, slide-right, slide-up,
            slide-down, reveal
          </p>
        </div>
      </section>
    </Wrapper>
  )
}
