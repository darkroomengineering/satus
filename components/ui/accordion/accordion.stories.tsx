import type { Meta, StoryObj } from '@storybook/react'
import { Accordion } from './index'

const meta = {
  title: 'UI/Accordion',
  component: Accordion.Root,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Accordion.Root>

export default meta

type Story = StoryObj<typeof meta>

const FAQ_ITEMS = [
  {
    question: 'What is Satūs?',
    answer:
      'Satūs is a modern, high-performance React application starter with Next.js, React 19, Tailwind CSS v4, and advanced WebGL capabilities.',
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

export const Default: Story = {
  render: () => (
    <div style={{ width: 400 }}>
      <Accordion.Group>
        {FAQ_ITEMS.map(({ question, answer }) => (
          <Accordion.Root key={question} className="border-white/20 border-b">
            {({ isOpen }) => (
              <>
                <Accordion.Button className="flex w-full justify-between py-3 text-left">
                  <span>{question}</span>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-block',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    ▼
                  </span>
                </Accordion.Button>
                <Accordion.Body className="pb-3 opacity-70">
                  {answer}
                </Accordion.Body>
              </>
            )}
          </Accordion.Root>
        ))}
      </Accordion.Group>
    </div>
  ),
}

export const SingleOpen: Story = {
  name: 'Single open at a time',
  render: () => {
    return (
      <div style={{ width: 400 }}>
        <Accordion.Group>
          {FAQ_ITEMS.map(({ question, answer }) => (
            <Accordion.Root key={question} className="border-white/20 border-b">
              {({ isOpen }) => (
                <>
                  <Accordion.Button className="flex w-full justify-between py-3 text-left">
                    <span>{question}</span>
                    <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
                  </Accordion.Button>
                  <Accordion.Body className="pb-3 opacity-70">
                    {answer}
                  </Accordion.Body>
                </>
              )}
            </Accordion.Root>
          ))}
        </Accordion.Group>
      </div>
    )
  },
}

export const DefaultOpen: Story = {
  render: () => (
    <div style={{ width: 400 }}>
      <Accordion.Root defaultOpen className="border-white/20 border-b">
        {({ isOpen }) => (
          <>
            <Accordion.Button className="flex w-full justify-between py-3 text-left">
              <span>Starts open</span>
              <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
            </Accordion.Button>
            <Accordion.Body className="pb-3 opacity-70">
              This accordion panel is open by default.
            </Accordion.Body>
          </>
        )}
      </Accordion.Root>
    </div>
  ),
}
