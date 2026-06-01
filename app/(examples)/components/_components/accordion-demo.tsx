'use client'

import cn from 'clsx'
import { Accordion } from '@/components/ui/accordion'

const ITEMS = [
  {
    question: 'What is Satūs?',
    answer:
      'Satūs is a modern, high-performance React application starter with Next.js 16, React 19, Tailwind CSS v4, and advanced WebGL capabilities.',
  },
  {
    question: 'Why Base UI?',
    answer:
      'Base UI provides unstyled, accessible components that integrate perfectly with any design system. It handles all the complex accessibility patterns for you.',
  },
  {
    question: 'How does Activity work?',
    answer:
      "React 19's Activity component defers updates for hidden content, improving performance by not re-rendering collapsed accordion panels.",
  },
]

function AccordionItem({
  question,
  answer,
}: {
  question: string
  answer: string
}) {
  return (
    <Accordion.Root className="border-white/20 border-b">
      {({ isOpen }) => (
        <>
          <Accordion.Button className="dr-py-12 flex w-full justify-between text-left">
            <span>{question}</span>
            <span
              aria-hidden="true"
              className={cn('transition-transform', isOpen && 'rotate-180')}
            >
              ▼
            </span>
          </Accordion.Button>
          <Accordion.Body className="dr-pb-12 opacity-70">
            {answer}
          </Accordion.Body>
        </>
      )}
    </Accordion.Root>
  )
}

export function AccordionDemo() {
  return (
    <div className="w-full max-w-md">
      <Accordion.Group>
        {ITEMS.map(({ question, answer }) => (
          <AccordionItem key={question} question={question} answer={answer} />
        ))}
      </Accordion.Group>
    </div>
  )
}
