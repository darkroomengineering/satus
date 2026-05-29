'use client'

import cn from 'clsx'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef } from 'react'
import { usePreferredReducedMotion } from '@/hooks/use-sync-external'
import s from './features.module.css'

gsap.registerPlugin(ScrollTrigger)

const STACK = [
  { name: 'Next.js 16', description: 'App Router + React Server Components' },
  { name: 'React 19', description: 'Compiler — no manual memoization' },
  { name: 'Tailwind v4', description: 'CSS-first config + custom utilities' },
  { name: 'GSAP', description: 'Animation library + SplitText' },
  { name: 'Lenis', description: 'Smooth scroll' },
  { name: 'Hamo', description: 'Performance hooks' },
  { name: 'R3F + drei', description: 'WebGL / 3D graphics' },
  { name: 'Zustand', description: 'Global state management' },
  { name: 'Base UI', description: 'Accessible, unstyled primitives' },
  { name: 'Zod', description: 'Schema validation' },
  { name: 'Bun + Turbopack', description: 'Fast installs and builds' },
  { name: 'Biome', description: 'Lint, format, type-check' },
] as const

const INTEGRATIONS = [
  { name: 'Sanity', description: 'Headless CMS' },
  { name: 'Shopify', description: 'Storefront API' },
  { name: 'HubSpot', description: 'CRM + forms' },
  { name: 'Mailchimp', description: 'Email campaigns' },
] as const

export function Features() {
  const sectionRef = useRef<HTMLElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const asideRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePreferredReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) return
    const rows = stackRef.current?.querySelectorAll(`.${s.stackItem}`)
    const asideItems = asideRef.current?.querySelectorAll(`.${s.integration}`)
    if (!rows?.length) return

    const ctx = gsap.context(() => {
      gsap.from(Array.from(rows ?? []), {
        opacity: 0,
        x: -16,
        duration: 0.7,
        stagger: 0.05,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          once: true,
        },
      })

      if (asideItems?.length) {
        gsap.from(Array.from(asideItems ?? []), {
          opacity: 0,
          y: 12,
          duration: 0.7,
          stagger: 0.08,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: asideRef.current,
            start: 'top 80%',
            once: true,
          },
        })
      }
    })

    return () => ctx.revert()
  }, [prefersReducedMotion])

  return (
    <section
      id="features"
      ref={sectionRef}
      className={cn(s.section, 'dr-layout-grid')}
    >
      <div className="col-span-full dt:col-start-2 dt:col-end-9">
        <h2 className={s.title}>Stack</h2>
        <div ref={stackRef} className={s.stack}>
          {STACK.map((item) => (
            <div key={item.name} className={s.stackItem}>
              <span className={s.stackName}>{item.name}</span>
              <span className={s.stackDescription}>{item.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={asideRef}
        className={cn(s.aside, 'col-span-full dt:col-start-10 dt:col-end-12')}
      >
        <h3 className={s.asideTitle}>Integrations</h3>
        <p className={s.asideDescription}>
          Optional — remove what you don&apos;t need.
        </p>
        <ul className={s.integrations}>
          {INTEGRATIONS.map((item) => (
            <li key={item.name} className={s.integration}>
              <span className={s.integrationName}>{item.name}</span>
              <span className={s.integrationDescription}>
                {item.description}
              </span>
            </li>
          ))}
        </ul>

        <div className={s.asideMeta}>
          <span className={s.asideMetaLabel}>Configure via</span>
          <code className={s.asideMetaCode}>bun run setup:project</code>
        </div>
      </div>
    </section>
  )
}
