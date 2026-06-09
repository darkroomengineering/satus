/**
 * The Satūs manual — a single, self-contained landing page.
 *
 * This is the ONE file you replace when starting a real project: swap this
 * component for your homepage and delete `page.module.css`. Nothing else in the
 * repo is wired into it, so there is nothing else to clean up.
 *
 * It walks from a fresh clone to a shippable site. Component demos live in
 * Storybook (`bun storybook`); integrations are opt-in plugins under
 * `lib/integrations/*`.
 */
import cn from 'clsx'
import { Wrapper } from '@/components/layout/wrapper'
import s from './page.module.css'

export const metadata = {
  title: 'Satūs — start here',
  description: 'From a fresh clone to a shippable site, one step at a time.',
}

interface Step {
  title: string
  body: React.ReactNode
}

const STEPS: Step[] = [
  {
    title: 'Run it',
    body: (
      <>
        <p className={s.text}>
          Install dependencies, then start the dev server on{' '}
          <code className={s.inline}>localhost:3000</code>.
        </p>
        <pre className={s.code}>
          <code>{`bun install\nbun dev`}</code>
        </pre>
      </>
    ),
  },
  {
    title: 'Make it yours',
    body: (
      <>
        <p className={s.text}>
          Copy <code className={s.inline}>.env.example</code> to{' '}
          <code className={s.inline}>.env</code> and set{' '}
          <code className={s.inline}>NEXT_PUBLIC_BASE_URL</code>.
        </p>
        <p className={s.text}>
          Edit site metadata and SEO in{' '}
          <code className={s.inline}>app/layout.tsx</code>. Swap fonts in{' '}
          <code className={s.inline}>lib/styles/fonts</code> and theme tokens in{' '}
          <code className={s.inline}>lib/styles/colors</code>.
        </p>
        <p className={s.text}>
          Replace the favicon and{' '}
          <code className={s.inline}>app/opengraph-image.jpg</code>.
        </p>
        <pre className={s.code}>
          <code>cp .env.example .env</code>
        </pre>
      </>
    ),
  },
  {
    title: 'Shape the chrome',
    body: (
      <>
        <p className={s.text}>
          Header, footer, and the page shell live in{' '}
          <code className={s.inline}>components/layout</code>.{' '}
          <code className={s.inline}>Wrapper</code> already renders the header
          and footer — don&apos;t add them per page.
        </p>
        <p className={s.text}>
          Lay pages out with the{' '}
          <code className={s.inline}>dr-layout-grid</code> utility.
        </p>
      </>
    ),
  },
  {
    title: 'Browse components',
    body: (
      <>
        <p className={s.text}>
          Every UI primitive is catalogued in Storybook — isolated, with
          controls and docs. Source lives in{' '}
          <code className={s.inline}>components/ui</code>; add a story next to
          any new component.
        </p>
        <pre className={s.code}>
          <code>bun storybook</code>
        </pre>
      </>
    ),
  },
  {
    title: 'Add a plugin',
    body: (
      <>
        <p className={s.text}>
          Integrations — Sanity, Shopify, HubSpot, WebGL — stay isolated under{' '}
          <code className={s.inline}>lib/integrations</code> and only activate
          once you configure them.
        </p>
        <p className={s.text}>
          Wire one up: set its env vars and follow the{' '}
          <code className={s.inline}>{'// USAGE'}</code> notes in its folder.
          Strip the ones you don&apos;t need with{' '}
          <code className={s.inline}>bun run setup:project</code>. An additive{' '}
          <code className={s.inline}>satus add &lt;plugin&gt;</code> CLI is
          planned — see issue #185.
        </p>
      </>
    ),
  },
  {
    title: 'Ship',
    body: (
      <>
        <p className={s.text}>Run the checks, build, and deploy to Vercel.</p>
        <pre className={s.code}>
          <code>{`bun run check\nbun run build`}</code>
        </pre>
      </>
    ),
  },
]

export default function HomePage() {
  return (
    <Wrapper theme="dark">
      <section className={cn(s.hero, 'dr-layout-grid')}>
        <div className="col-span-full dt:col-start-2 dt:col-end-11">
          <p className={s.kicker}>Start here</p>
          <h1 className={s.title}>Satūs</h1>
          <p className={s.lede}>
            A standards starter, not a product. Follow the steps below from a
            fresh clone to a site you can ship — then replace this page with
            your own.
          </p>
        </div>
      </section>

      <section className={cn(s.guide, 'dr-layout-grid')}>
        <div className="col-span-full dt:col-start-2 dt:col-end-11">
          <ol className={s.steps}>
            {STEPS.map((step, i) => (
              <li key={step.title} className={s.step}>
                <span className={s.index}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className={s.content}>
                  <h2 className={s.stepTitle}>{step.title}</h2>
                  {step.body}
                </div>
              </li>
            ))}
          </ol>
          <p className={s.outro}>
            Done exploring? Replace app/page.tsx with your homepage and delete
            page.module.css — that&apos;s the only cleanup.
          </p>
        </div>
      </section>
    </Wrapper>
  )
}
