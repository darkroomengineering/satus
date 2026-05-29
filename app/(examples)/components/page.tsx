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
            <div className={s.component}>
              <div className={s.componentHeader}>
                <span className={s.componentName}>Menu</span>
                <span className={s.componentDescription}>
                  Dropdown menus with keyboard navigation
                </span>
              </div>
              <div className={s.componentDemo}>
                <MenuDemo />
              </div>
            </div>

            <div className={s.component}>
              <div className={s.componentHeader}>
                <span className={s.componentName}>Select</span>
                <span className={s.componentDescription}>
                  Custom select with controlled mode
                </span>
              </div>
              <div className={s.componentDemo}>
                <SelectDemo />
              </div>
            </div>

            <div className={s.component}>
              <div className={s.componentHeader}>
                <span className={s.componentName}>Accordion</span>
                <span className={s.componentDescription}>
                  Expandable sections using Base UI Collapsible
                </span>
              </div>
              <div className={s.componentDemo}>
                <AccordionDemo />
              </div>
            </div>

            <div className={s.component}>
              <div className={s.componentHeader}>
                <span className={s.componentName}>Tabs</span>
                <span className={s.componentDescription}>Tab navigation</span>
              </div>
              <div className={s.componentDemo}>
                <TabsDemo />
              </div>
            </div>

            <div className={s.component}>
              <div className={s.componentHeader}>
                <span className={s.componentName}>Tooltip</span>
                <span className={s.componentDescription}>
                  Hover hints with arrow
                </span>
              </div>
              <div className={s.componentDemo}>
                <TooltipDemo />
              </div>
            </div>

            <div className={s.component}>
              <div className={s.componentHeader}>
                <span className={s.componentName}>Alert Dialog</span>
                <span className={s.componentDescription}>
                  Confirmation dialogs
                </span>
              </div>
              <div className={s.componentDemo}>
                <AlertDialogDemo />
              </div>
            </div>

            <div className={s.component}>
              <div className={s.componentHeader}>
                <span className={s.componentName}>Switch</span>
                <span className={s.componentDescription}>Toggle switches</span>
              </div>
              <div className={s.componentDemo}>
                <SwitchDemo />
              </div>
            </div>

            <div className={s.component}>
              <div className={s.componentHeader}>
                <span className={s.componentName}>Checkbox</span>
                <span className={s.componentDescription}>
                  Accessible checkboxes
                </span>
              </div>
              <div className={s.componentDemo}>
                <CheckboxDemo />
              </div>
            </div>

            <div className={s.component}>
              <div className={s.componentHeader}>
                <span className={s.componentName}>Link</span>
                <span className={s.componentDescription}>
                  Auto-detects internal vs external
                </span>
              </div>
              <div className={s.componentDemo}>
                <LinkDemo />
              </div>
            </div>

            <div className={s.component}>
              <div className={s.componentHeader}>
                <span className={s.componentName}>Marquee</span>
                <span className={s.componentDescription}>
                  Infinite scroll with velocity
                </span>
              </div>
              <div className={s.componentDemo}>
                <MarqueeDemo />
              </div>
            </div>
          </div>
        </div>
      </section>
    </Wrapper>
  )
}
