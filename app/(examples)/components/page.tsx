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

export default function ComponentsPage() {
  return (
    <Wrapper theme="dark">
      <section className={cn(s.hero, 'dr-layout-grid')}>
        <div className="col-span-full dt:col-start-2 dt:col-end-10">
          <p className={s.label}>UI Library</p>
          <h1 className={s.title}>Components</h1>
          <p className={s.subtitle}>
            Accessible primitives from{' '}
            <code className={s.code}>@/components/ui</code>
          </p>
        </div>
      </section>

      <section className={cn(s.list, 'dr-layout-grid')}>
        <div className="col-span-full dt:col-start-2 dt:col-end-12">
          <p className={s.sectionLabel}>Library</p>
          <div className={s.components}>
            {COMPONENTS.map((item, i) => (
              <div key={item.name} className={s.component}>
                <div className={s.componentHeader}>
                  <div className={s.componentMeta}>
                    <span className={s.componentIndex}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className={s.componentName}>{item.name}</span>
                  </div>
                  <span className={s.componentDescription}>
                    {item.description}
                  </span>
                </div>
                <div className={s.componentDemo}>{item.demo}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Wrapper>
  )
}
