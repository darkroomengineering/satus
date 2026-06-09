import type { Meta, StoryObj } from '@storybook/react'
import { Link } from './index'

const meta = {
  title: 'UI/Link',
  component: Link,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Link>

export default meta

type Story = StoryObj<typeof meta>

export const Internal: Story = {
  args: {
    href: '/',
    children: 'Internal Link (uses next/link)',
    className: 'underline hover:opacity-70',
  },
}

export const External: Story = {
  args: {
    href: 'https://base-ui.com',
    children: 'External Link (opens in new tab)',
    className: 'underline hover:opacity-70',
  },
}

export const ButtonFallback: Story = {
  name: 'Button fallback (no href)',
  args: {
    onClick: () => console.log('clicked'),
    children: 'Acts as a button',
    className: 'underline hover:opacity-70',
  },
}
