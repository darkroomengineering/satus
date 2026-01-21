import cn from 'clsx'
import s from './value-props.module.css'

const VALUE_PROPS = [
  {
    title: 'Modern Stack',
    features: [
      'Next.js 16 + App Router',
      'React 19 + Compiler',
      'Tailwind CSS v4',
      'TypeScript strict mode',
    ],
  },
  {
    title: 'Developer Experience',
    features: [
      'Interactive project setup',
      'Cmd+O debug panel',
      'Code generation CLI',
      'Biome linting',
    ],
  },
  {
    title: 'Production Ready',
    features: [
      'Security headers (CSP, HSTS)',
      'Lighthouse CI testing',
      'Dependabot auto-merge',
      'Performance optimized',
    ],
  },
] as const

export function ValueProps() {
  return (
    <section className={cn(s.section, 'dr-layout-grid')}>
      <div className="col-span-full dt:col-start-2 dt:col-end-12">
        <div className={s.grid}>
          {VALUE_PROPS.map((prop, index) => (
            <div key={prop.title} className={s.card}>
              <span className={s.index}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className={s.cardTitle}>{prop.title}</h3>
              <ul className={s.features}>
                {prop.features.map((feature) => (
                  <li key={feature} className={s.feature}>
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
