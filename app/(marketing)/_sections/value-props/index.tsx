'use client'

import cn from 'clsx'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef } from 'react'
import { usePreferredReducedMotion } from '@/hooks/use-sync-external'
import s from './value-props.module.css'

gsap.registerPlugin(ScrollTrigger)

const VALUE_PROPS = [
  {
    title: 'Modern Stack',
    features: [
      'Next.js 16 + App Router',
      'React 19 + Compiler',
      'Tailwind CSS v4',
      'TypeScript ultra-strict',
    ],
  },
  {
    title: 'Developer Experience',
    features: [
      'Bun + Turbopack',
      'Cmd+O debug panel',
      'Code generation CLI',
      'Biome linting',
      '424 tests',
    ],
  },
  {
    title: 'Production Ready',
    features: [
      'Security headers',
      'Lighthouse CI',
      'Base UI components',
      'Typed routes',
      'Zod validation',
    ],
  },
] as const

export function ValueProps() {
  const sectionRef = useRef<HTMLElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePreferredReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) return
    const cards = cardsRef.current?.querySelectorAll(`.${s.card}`)
    if (!cards?.length) return

    const ctx = gsap.context(() => {
      gsap.from(Array.from(cards ?? []), {
        opacity: 0,
        y: 32,
        duration: 0.9,
        stagger: 0.12,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          once: true,
        },
      })
    })

    return () => ctx.revert()
  }, [prefersReducedMotion])

  return (
    <section ref={sectionRef} className={cn(s.section, 'dr-layout-grid')}>
      <div className="col-span-full dt:col-start-2 dt:col-end-12">
        <div ref={cardsRef} className={s.grid}>
          {VALUE_PROPS.map((prop, index) => (
            <div key={prop.title} className={s.card}>
              <span className={s.index} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className={s.cardTitle}>{prop.title}</h3>
              <ul className={s.features}>
                {prop.features.map((feature) => (
                  <li key={feature} className={s.feature}>
                    <span className={s.featureDot} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
