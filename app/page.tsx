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
import { Link } from '@/components/ui/link'
import s from './page.module.css'

export const metadata = {
  title: 'Satūs: start here',
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
          Install dependencies, then start the dev server. It runs on{' '}
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
          Point the site at your domain: copy{' '}
          <code className={s.inline}>.env.example</code> to{' '}
          <code className={s.inline}>.env</code> and set{' '}
          <code className={s.inline}>NEXT_PUBLIC_BASE_URL</code>.
        </p>
        <p className={s.text}>
          The site title and SEO live in{' '}
          <code className={s.inline}>app/layout.tsx</code>. Fonts are in{' '}
          <code className={s.inline}>lib/styles/fonts</code>, colors and theme
          tokens in <code className={s.inline}>lib/styles/colors</code>.
        </p>
        <p className={s.text}>
          Swap in your own favicon and{' '}
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
          The header, footer, and page shell live in{' '}
          <code className={s.inline}>components/layout</code>. The header and
          footer are already part of <code className={s.inline}>Wrapper</code>,
          so you don&apos;t add them on each page.
        </p>
        <p className={s.text}>
          Pages are laid out with one grid class:{' '}
          <code className={s.inline}>dr-layout-grid</code>.
        </p>
      </>
    ),
  },
  {
    title: 'Browse components',
    body: (
      <>
        <p className={s.text}>
          Every component lives in Storybook, on its own, with controls and
          docs. The source sits in{' '}
          <code className={s.inline}>components/ui</code>. When you add a
          component, add a story beside it.
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
          Integrations like Sanity, Shopify, HubSpot, and WebGL stay tucked away
          in <code className={s.inline}>lib/integrations</code>. They do nothing
          until you set them up.
        </p>
        <p className={s.text}>
          To turn one on, set its env vars and follow the in-folder notes marked{' '}
          <code className={s.inline}>{'// USAGE'}</code>. To remove the ones you
          don&apos;t need, run{' '}
          <code className={s.inline}>bun run setup:project</code>. A command for
          the reverse,{' '}
          <code className={s.inline}>satus add &lt;plugin&gt;</code>, is on the
          way (see issue #185).
        </p>
      </>
    ),
  },
  {
    title: 'Ship',
    body: (
      <>
        <p className={s.text}>Run the checks and build, then deploy.</p>
        <pre className={s.code}>
          <code>{`bun run check\nbun run build`}</code>
        </pre>
        <p className={s.text}>
          Or skip the wait and{' '}
          <Link
            className={s.link}
            href="https://vercel.com/new/clone?repository-url=https://github.com/darkroomengineering/satus&project-name=satus&repository-name=satus"
          >
            deploy to Vercel in one click
          </Link>
          .
        </p>
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
            A starter, not a product. The steps below take you from a fresh
            clone to something you can ship. When you&apos;re ready, replace
            this page with your own.
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
            Done here? Replace app/page.tsx with your homepage and delete
            page.module.css. That&apos;s the only cleanup.
          </p>
        </div>
      </section>
    </Wrapper>
  )
}
