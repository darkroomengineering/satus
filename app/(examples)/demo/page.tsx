import { Wrapper } from '@/components/layout/wrapper'
import { Fold } from '@/components/ui/fold'
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

export const metadata = {
  title: 'Demo - Satūs',
  description: 'Component library showcase',
}

export default function DemoPage() {
  return (
    <Wrapper theme="evil" className="font-mono">
      {/* Header outside Fold */}
      <section className="m-auto w-1/2">
        <div className="dr-layout-block dr-py-64 dt:dr-py-100">
          <header className="dr-mb-48 dt:dr-mb-64">
            <h1 className="dr-text-32 dt:dr-text-48 font-bold">Components</h1>
            <p className="dr-mt-8 dt:dr-mt-12 opacity-70">
              UI component library from @/components/ui
            </p>
            <p className="dr-mt-4 text-sm opacity-40">
              Each section uses the Fold component for parallax scroll effects
            </p>
          </header>
        </div>

        {/* Base UI Components - each wrapped in Fold */}
        <Fold type="bottom">
          <Section
            title="Menu"
            description="Dropdown menus with keyboard navigation"
          >
            <MenuDemo />
          </Section>
        </Fold>

        <Fold type="bottom">
          <Section
            title="Select"
            description="Custom select with controlled mode support"
          >
            <SelectDemo />
          </Section>
        </Fold>

        <Fold type="bottom">
          <Section
            title="Accordion"
            description="Expandable sections using Base UI Collapsible + React 19 Activity"
          >
            <AccordionDemo />
          </Section>
        </Fold>

        <Fold type="bottom">
          <Section title="Tabs" description="Tab navigation">
            <TabsDemo />
          </Section>
        </Fold>

        <Fold type="bottom">
          <Section title="Tooltip" description="Hover hints with arrow">
            <TooltipDemo />
          </Section>
        </Fold>

        <Fold type="bottom">
          <Section title="Alert Dialog" description="Confirmation dialogs">
            <AlertDialogDemo />
          </Section>
        </Fold>

        <Fold type="bottom">
          <Section title="Switch" description="Toggle switches">
            <SwitchDemo />
          </Section>
        </Fold>

        <Fold type="bottom">
          <Section title="Checkbox" description="Accessible checkboxes">
            <CheckboxDemo />
          </Section>
        </Fold>

        {/* Custom Components */}
        <Fold type="bottom">
          <Section
            title="Link"
            description="Auto-detects internal vs external links"
          >
            <LinkDemo />
          </Section>
        </Fold>

        <Fold type="bottom">
          <Section
            title="Marquee"
            description="Infinite scrolling text with scroll velocity"
          >
            <MarqueeDemo />
          </Section>
        </Fold>
      </section>

      {/* Notes Section - outside Fold container with z-index to sit above */}
      <footer className="relative z-10 bg-black">
        <div className="dr-py-64 dt:dr-py-100 m-auto h-svh w-1/2">
          <div className="dr-pt-32 border-white/20 border-t">
            <h3 className="dr-text-18 font-semibold">Additional Components</h3>
            <p className="dr-mt-8 text-sm opacity-60">
              These components are available but not demoed here:
            </p>
            <ul className="dr-mt-12 list-disc pl-5 text-sm opacity-60">
              <li>
                <strong>Form</strong> — See /hubspot example for form with
                validation and server actions
              </li>
              <li>
                <strong>Image</strong> — Optimized image component with
                next/image
              </li>
              <li>
                <strong>Scrollbar</strong> — Custom scrollbar (requires Lenis)
              </li>
              <li>
                <strong>SanityImage</strong> — Image component for Sanity CMS
              </li>
              <li>
                <strong>RealViewport</strong> — Viewport measurement utility
              </li>
              <li>
                <strong>ScrollRestoration</strong> — Scroll position restoration
              </li>
              <li>
                <strong>Toast</strong> — Notification toasts (needs provider)
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </Wrapper>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="flex h-svh items-center justify-center">
      <div className="dr-rounded-12 dt:dr-rounded-16 dr-p-24 dt:dr-p-32 w-full max-w-3xl border border-white/20 bg-black bg-zinc-900">
        <div className="dr-mb-16 dt:dr-mb-24">
          <h3 className="dr-text-18 dt:dr-text-24 font-semibold">{title}</h3>
          <p className="dr-mt-4 text-sm opacity-60">{description}</p>
        </div>
        <div className="flex flex-wrap gap-4">{children}</div>
      </div>
    </section>
  )
}
