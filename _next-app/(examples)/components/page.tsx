import cn from 'clsx'
import { Wrapper } from '@/components/layout/wrapper'
import { AccordionDemo } from './_components/accordion-demo'
import { AlertDialogDemo } from './_components/alert-dialog-demo'
import { CheckboxDemo } from './_components/checkbox-demo'
import { LinkDemo } from './_components/link-demo'
import { MarqueeDemo } from './_components/marquee-demo'
import { MenuDemo } from './_components/menu-demo'
import { SelectDemo } from './_components/select-demo'
import { SwitchDemo } from './_components/switch-demo'
import { TabsDemo } from './_components/tabs-demo'
import { TooltipDemo } from './_components/tooltip-demo'
import s from './page.module.css'

export const metadata = {
  title: 'Components - Satūs',
  description: 'Component library showcase',
}

const COMPONENTS = [
  {
    name: 'Menu',
    description: 'Dropdown menus with keyboard navigation',
    demo: <MenuDemo />,
  },
  {
    name: 'Select',
    description: 'Custom select with controlled mode',
    demo: <SelectDemo />,
  },
  {
    name: 'Accordion',
    description: 'Expandable sections using Base UI Collapsible',
    demo: <AccordionDemo />,
  },
  {
    name: 'Tabs',
    description: 'Tab navigation',
    demo: <TabsDemo />,
  },
  {
    name: 'Tooltip',
    description: 'Hover hints with arrow',
    demo: <TooltipDemo />,
  },
  {
    name: 'Alert Dialog',
    description: 'Confirmation dialogs',
    demo: <AlertDialogDemo />,
  },
  {
    name: 'Switch',
    description: 'Toggle switches',
    demo: <SwitchDemo />,
  },
  {
    name: 'Checkbox',
    description: 'Accessible checkboxes',
    demo: <CheckboxDemo />,
  },
  {
    name: 'Link',
    description: 'Auto-detects internal vs external',
    demo: <LinkDemo />,
  },
  {
    name: 'Marquee',
    description: 'Infinite scroll with velocity',
    demo: <MarqueeDemo />,
  },
] as const

const ADDITIONAL = [
  { name: 'Form', description: 'See /hubspot for validation example' },
  { name: 'Image', description: 'Optimized next/image wrapper' },
  { name: 'Scrollbar', description: 'Custom scrollbar (requires Lenis)' },
  { name: 'SanityImage', description: 'Sanity CMS image component' },
  { name: 'RealViewport', description: 'Viewport measurement utility' },
  { name: 'Toast', description: 'Notification toasts' },
] as const

export default function ComponentsPage() {
  return (
    <Wrapper theme="dark">
      <section className={cn(s.hero, 'dr-layout-grid')}>
        <div className="col-span-full dt:col-start-3 dt:col-end-11">
          <h1 className={s.title}>Components</h1>
          <p className={s.subtitle}>
            UI library from <code className={s.code}>@/components/ui</code>
          </p>
        </div>
      </section>

      <section className={cn(s.list, 'dr-layout-grid')}>
        <div className="col-span-full dt:col-start-3 dt:col-end-8">
          <h2 className={s.sectionTitle}>Library</h2>
          <div className={s.components}>
            {COMPONENTS.map((component) => (
              <div key={component.name} className={s.component}>
                <div className={s.componentHeader}>
                  <span className={s.componentName}>{component.name}</span>
                  <span className={s.componentDescription}>
                    {component.description}
                  </span>
                </div>
                <div className={s.componentDemo}>{component.demo}</div>
              </div>
            ))}
          </div>
        </div>

        <aside
          className={cn(s.aside, 'col-span-full dt:col-start-9 dt:col-end-12')}
        >
          <h3 className={s.asideTitle}>Additional</h3>
          <p className={s.asideDescription}>Available but not demoed here</p>
          <ul className={s.additional}>
            {ADDITIONAL.map((item) => (
              <li key={item.name} className={s.additionalItem}>
                <span className={s.additionalName}>{item.name}</span>
                <span className={s.additionalDescription}>
                  {item.description}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </Wrapper>
  )
}
