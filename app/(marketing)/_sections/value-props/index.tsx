'use client'

import cn from 'clsx'
import { Fold } from '@/components/ui/fold'
import s from './value-props.module.css'

const VALUE_PROPS = [
  {
    title: 'Modern Stack',
    description:
      'Next.js 16 with App Router, React 19 with automatic memoization via React Compiler, Tailwind CSS v4, and TypeScript in strict mode.',
    features: [
      'React Compiler (no useMemo/useCallback)',
      'Turbopack for fast builds',
      'Biome for linting & formatting',
    ],
  },
  {
    title: 'Developer Experience',
    description:
      'Interactive project setup, code generation CLI, and debug tools that make development a joy.',
    features: [
      'bun run setup:project presets',
      'Cmd+O debug panel',
      'bun run generate scaffolding',
    ],
  },
  {
    title: 'Production Ready',
    description:
      'Security headers, performance optimizations, and CI/CD workflows included out of the box.',
    features: [
      'CSP, HSTS, XSS protection',
      'Lighthouse CI testing',
      'Dependabot auto-merge',
    ],
  },
] as const

function ValueCard({
  title,
  description,
  features,
  index,
}: {
  title: string
  description: string
  features: readonly string[]
  index: number
}) {
  return (
    <div className={s.card}>
      <span className={s.index}>0{index + 1}</span>
      <h3 className={s.cardTitle}>{title}</h3>
      <p className={s.cardDescription}>{description}</p>
      <ul className={s.features}>
        {features.map((feature) => (
          <li key={feature} className={s.feature}>
            <span className={s.bullet}>→</span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ValueProps() {
  return (
    <section className={cn(s.section, 'dr-layout-grid')}>
      <div className="col-span-full dt:col-start-3 dt:col-end-11">
        <header className={s.header}>
          <h2 className={s.title}>Why Satus?</h2>
          <p className={s.subtitle}>
            Everything you need to build production-ready creative websites.
          </p>
        </header>

        <div className={s.grid}>
          {VALUE_PROPS.map((prop, index) => (
            <Fold key={prop.title} type="bottom" overlay={false}>
              <ValueCard {...prop} index={index} />
            </Fold>
          ))}
        </div>
      </div>
    </section>
  )
}
