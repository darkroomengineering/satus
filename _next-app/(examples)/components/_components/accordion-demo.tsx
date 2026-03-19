'use client'

import cn from 'clsx'
import { Accordion } from '@/components/ui/accordion'

export function AccordionDemo() {
  return (
    <div className="w-full max-w-md">
      <Accordion.Group>
        <Accordion.Root className="border-white/20 border-b">
          {({ isOpen }) => (
            <>
              <Accordion.Button className="dr-py-12 flex w-full justify-between text-left">
                <span>What is Satūs?</span>
                <span
                  className={cn('transition-transform', isOpen && 'rotate-180')}
                >
                  ▼
                </span>
              </Accordion.Button>
              <Accordion.Body className="dr-pb-12 opacity-70">
                Satūs is a modern, high-performance React application starter
                with Next.js 16, React 19, Tailwind CSS v4, and advanced WebGL
                capabilities.
              </Accordion.Body>
            </>
          )}
        </Accordion.Root>

        <Accordion.Root className="border-white/20 border-b">
          {({ isOpen }) => (
            <>
              <Accordion.Button className="dr-py-12 flex w-full justify-between text-left">
                <span>Why Base UI?</span>
                <span
                  className={cn('transition-transform', isOpen && 'rotate-180')}
                >
                  ▼
                </span>
              </Accordion.Button>
              <Accordion.Body className="dr-pb-12 opacity-70">
                Base UI provides unstyled, accessible components that integrate
                perfectly with any design system. It handles all the complex
                accessibility patterns for you.
              </Accordion.Body>
            </>
          )}
        </Accordion.Root>

        <Accordion.Root className="border-white/20 border-b">
          {({ isOpen }) => (
            <>
              <Accordion.Button className="dr-py-12 flex w-full justify-between text-left">
                <span>How does Activity work?</span>
                <span
                  className={cn('transition-transform', isOpen && 'rotate-180')}
                >
                  ▼
                </span>
              </Accordion.Button>
              <Accordion.Body className="dr-pb-12 opacity-70">
                React 19&apos;s Activity component defers updates for hidden
                content, improving performance by not re-rendering collapsed
                accordion panels.
              </Accordion.Body>
            </>
          )}
        </Accordion.Root>
      </Accordion.Group>
    </div>
  )
}
