import cn from 'clsx'
import s from './features.module.css'

const STACK = [
  { name: 'Lenis', description: 'Smooth scroll' },
  { name: 'Tempus', description: 'RAF orchestration' },
  { name: 'Hamo', description: 'Performance hooks' },
  { name: 'GSAP', description: 'Animation library' },
  { name: 'R3F + drei', description: 'WebGL / 3D graphics' },
  { name: 'Zustand', description: 'State management' },
  { name: 'Base UI', description: 'Accessible primitives' },
  { name: 'Theatre.js', description: 'Animation editor' },
] as const

const INTEGRATIONS = ['Sanity', 'Shopify', 'HubSpot', 'Mailchimp'] as const

export function Features() {
  return (
    <section id="features" className={cn(s.section, 'dr-layout-grid')}>
      <div className="col-span-full dt:col-start-2 dt:col-end-9">
        <h2 className={s.title}>Stack</h2>
        <div className={s.stack}>
          {STACK.map((item) => (
            <div key={item.name} className={s.stackItem}>
              <span className={s.stackName}>{item.name}</span>
              <span className={s.stackDescription}>{item.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className={cn(s.aside, 'col-span-full dt:col-start-10 dt:col-end-12')}
      >
        <h3 className={s.asideTitle}>Integrations</h3>
        <p className={s.asideDescription}>
          Optional. Remove what you don't need.
        </p>
        <ul className={s.integrations}>
          {INTEGRATIONS.map((item) => (
            <li key={item} className={s.integration}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
