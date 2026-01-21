'use client'

import cn from 'clsx'
import { Accordion } from '@/components/ui/accordion'
import { Link } from '@/components/ui/link'
import s from './getting-started.module.css'

const STEPS = [
  {
    title: '1. Create your project',
    content: (
      <>
        <p>Clone the template and install dependencies:</p>
        <div className={s.codeBlock}>
          <code>bunx degit darkroomengineering/satus my-project</code>
        </div>
        <div className={s.codeBlock}>
          <code>cd my-project && bun install</code>
        </div>
      </>
    ),
  },
  {
    title: '2. Configure your stack',
    content: (
      <>
        <p>Choose integrations interactively or pick a preset:</p>
        <div className={s.codeBlock}>
          <code>bun run setup:project</code>
        </div>
        <p className={s.hint}>
          This removes unused integrations and updates your config. Skip this
          step to keep everything.
        </p>
      </>
    ),
  },
  {
    title: '3. Start building',
    content: (
      <>
        <p>Run the development server:</p>
        <div className={s.codeBlock}>
          <code>bun dev</code>
        </div>
        <p className={s.hint}>
          Press <kbd>Cmd/Ctrl + O</kbd> to open debug tools. Use{' '}
          <code>bun run generate</code> to scaffold new pages and components.
        </p>
      </>
    ),
  },
] as const

const LINKS = [
  {
    label: 'GitHub',
    href: 'https://github.com/darkroomengineering/satus',
    description: 'Source code and issues',
  },
  {
    label: 'Use Template',
    href: 'https://github.com/darkroomengineering/satus/generate',
    description: 'Create a new repository',
  },
  {
    label: 'Component Demo',
    href: '/components',
    description: 'Browse UI components',
  },
  {
    label: 'DeepWiki',
    href: 'https://deepwiki.com/darkroomengineering/satus',
    description: 'AI-powered documentation',
  },
] as const

export function GettingStarted() {
  return (
    <section className={cn(s.section, 'dr-layout-grid')}>
      <div className="col-span-full dt:col-start-3 dt:col-end-11">
        <header className={s.header}>
          <h2 className={s.title}>Get Started</h2>
          <p className={s.subtitle}>Up and running in under a minute.</p>
        </header>

        <div className={s.content}>
          <div className={s.steps}>
            <Accordion.Group>
              {STEPS.map((step, index) => (
                <Accordion.Root key={step.title} defaultOpen={index === 0}>
                  {({ isOpen }) => (
                    <>
                      <Accordion.Button className={s.stepButton}>
                        <span className={s.stepTitle}>{step.title}</span>
                        <span className={s.stepIcon}>{isOpen ? '−' : '+'}</span>
                      </Accordion.Button>
                      <Accordion.Body>
                        <div className={s.stepBody}>{step.content}</div>
                      </Accordion.Body>
                    </>
                  )}
                </Accordion.Root>
              ))}
            </Accordion.Group>
          </div>

          <div className={s.links}>
            <h3 className={s.linksTitle}>Quick Links</h3>
            {LINKS.map((link) => (
              <Link key={link.label} href={link.href} className={s.link}>
                <span className={s.linkLabel}>{link.label}</span>
                <span className={s.linkDescription}>{link.description}</span>
                <span className={s.linkArrow}>→</span>
              </Link>
            ))}
          </div>
        </div>

        <footer className={s.footer}>
          <p>
            Built by{' '}
            <Link href="https://darkroom.engineering" className={s.footerLink}>
              darkroom.engineering
            </Link>
          </p>
          <p className={s.footerHint}>
            Need help? Open an issue on GitHub or hire us for your next project.
          </p>
        </footer>
      </div>
    </section>
  )
}
