'use client'

import cn from 'clsx'
import { Link } from '@/components/ui/link'
import s from './hero.module.css'

const INSTALL_COMMAND = 'bunx degit darkroomengineering/satus my-project'

function CopyButton({ text }: { text: string }) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={s.copyButton}
      aria-label="Copy to clipboard"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  )
}

export function Hero() {
  return (
    <section className={cn(s.hero, 'dr-layout-grid')}>
      <div
        className={cn(s.content, 'col-span-full dt:col-start-3 dt:col-end-11')}
      >
        <div className={s.badge}>Next.js 16 + React 19 + Tailwind v4</div>

        <h1 className={s.title}>Satūs</h1>

        <p className={s.tagline}>
          Part of{' '}
          <Link href="https://oss.darkroom.engineering" className={s.link}>
            Darkroom Open Source Operative System
          </Link>
        </p>

        <div className={s.install}>
          <code className={s.command}>{INSTALL_COMMAND}</code>
          <CopyButton text={INSTALL_COMMAND} />
        </div>

        <div className={s.ctas}>
          <Link
            href="https://github.com/darkroomengineering/satus/generate"
            className={cn(s.cta, s.primary)}
          >
            Use Template
          </Link>
          <Link href="/components" className={cn(s.cta, s.secondary)}>
            View Components
          </Link>
          <Link
            href="https://github.com/darkroomengineering/satus"
            className={cn(s.cta, s.secondary)}
          >
            GitHub
          </Link>
        </div>
      </div>

      <div className={s.scrollIndicator}>
        <span>Scroll to explore</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </section>
  )
}
