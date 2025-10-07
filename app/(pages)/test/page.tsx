import { Wrapper } from '~/app/(pages)/(components)/wrapper'
import {
  AccordionTest,
  ActivitySimpleTest,
  DataFetchingTest,
  ScrollTriggerTest,
  TransformTest,
  WebGLTest,
} from './sections'

export const metadata = {
  title: 'React 19.2 Feature Tests',
  description: 'Testing Phase 1 & Phase 2 React 19.2 features',
  robots: { index: false, follow: false },
}

export default function TestPage() {
  return (
    <Wrapper theme="light" className="font-mono" webgl>
      <div className="container mx-auto px-4 py-16 space-y-24">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold">React 19.2 Feature Tests</h1>
          <p className="text-lg opacity-70">
            Testing Phase 1 & Phase 2 implementations
          </p>
        </header>

        {/* Activity Simple Test */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Activity Simple Test</h2>
            <p className="opacity-70">
              Testing if Activity component works in isolation
            </p>
          </div>
          <ActivitySimpleTest />
        </section>

        {/* Phase 1: cacheSignal */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">Phase 1: cacheSignal</h2>
            <p className="opacity-70">
              Server-side data fetching with automatic request cleanup
            </p>
          </div>
          <DataFetchingTest />
        </section>

        {/* Phase 1: Accordion with Activity */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Phase 1: Accordion + Activity
            </h2>
            <p className="opacity-70">
              Accordion component with deferred updates when closed
            </p>
          </div>
          <AccordionTest />
        </section>

        {/* Phase 2: useScrollTrigger with useEffectEvent */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Phase 2: useScrollTrigger + useEffectEvent
            </h2>
            <p className="opacity-70">
              Scroll trigger with optimized effect dependencies
            </p>
          </div>
          <ScrollTriggerTest />
        </section>

        {/* Phase 2: Transform hooks with useEffectEvent */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Phase 2: Transform hooks + useEffectEvent
            </h2>
            <p className="opacity-70">
              Transform state management with optimized callbacks
            </p>
          </div>
          <TransformTest />
        </section>

        {/* Phase 2: WebGL with Activity */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Phase 2: WebGL + Activity
            </h2>
            <p className="opacity-70">
              WebGL scenes with viewport-based activation
            </p>
          </div>
          <WebGLTest />
        </section>

        {/* Footer */}
        <footer className="text-center text-sm opacity-50 pt-16">
          <p>All features tested successfully ✓</p>
        </footer>
      </div>
    </Wrapper>
  )
}
