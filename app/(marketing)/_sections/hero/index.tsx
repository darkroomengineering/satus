'use client'

import cn from 'clsx'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { AnimatedGradient } from '@/components/effects/animated-gradient'
import { Link } from '@/components/ui/link'
import { usePreferredReducedMotion } from '@/hooks/use-sync-external'
import s from './hero.module.css'

const INSTALL_COMMAND = 'bunx degit darkroomengineering/satus my-project'

// Black → Kodak red; warped by the cursor-driven fluid sim (flowmap).
const GRADIENT_COLORS = ['#000000', '#e30613']

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={s.copyButton}
      aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
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
      )}
    </button>
  )
}

export function Hero() {
  const prefersReducedMotion = usePreferredReducedMotion()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const installRef = useRef<HTMLDivElement>(null)
  const ctasRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (prefersReducedMotion) return

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })

    tl.from(
      titleRef.current,
      {
        opacity: 0,
        y: 24,
        duration: 1.2,
      },
      0
    )

    tl.from(
      [
        badgeRef.current,
        taglineRef.current,
        installRef.current,
        ctasRef.current,
      ],
      {
        opacity: 0,
        y: 16,
        duration: 0.8,
        stagger: 0.1,
      },
      0.2
    )

    return () => {
      tl.kill()
    }
  }, [prefersReducedMotion])

  return (
    <section className={cn(s.hero, 'dr-layout-grid')}>
      {/* CSS glow: always-on base + reduced-motion / no-GPU fallback */}
      <div className={s.gradient} aria-hidden="true" />
      {/* Interactive WebGL fluid layer (cursor-reactive via flowmap) */}
      {!prefersReducedMotion && (
        <AnimatedGradient
          className={cn(s.webglGradient)}
          colors={GRADIENT_COLORS}
          speed={1.0}
          amplitude={2.2}
          frequency={0.35}
          drip={1.2}
          radial
          flowmap
        />
      )}

      <div className={s.scrim} aria-hidden="true" />

      <div
        className={cn(s.content, 'col-span-full dt:col-start-3 dt:col-end-11')}
      >
        <div ref={badgeRef} className={s.badge}>
          Next.js 16 — React 19 — Tailwind v4
        </div>

        <h1 ref={titleRef} className={s.title}>
          Satūs
        </h1>

        <p ref={taglineRef} className={s.tagline}>
          Part of{' '}
          <Link href="https://oss.darkroom.engineering" className={s.link}>
            Darkroom Open Source Operative System
          </Link>
        </p>

        <div ref={installRef} className={s.install}>
          <code className={s.command}>{INSTALL_COMMAND}</code>
          <CopyButton text={INSTALL_COMMAND} />
        </div>

        <div ref={ctasRef} className={s.ctas}>
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

      <div className={s.scrollIndicator} aria-hidden="true">
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
