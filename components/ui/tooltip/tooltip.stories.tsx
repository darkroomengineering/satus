import type { Meta, StoryObj } from '@storybook/react'
import { Tooltip } from './index'

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    content: 'This is a tooltip',
    children: <button type="button">Hover me</button>,
  },
}

export const Placement: Story = {
  args: {
    content: 'Tooltip on the right',
    side: 'right',
    children: <button type="button">Hover me</button>,
  },
}

export const RichContent: Story = {
  args: {
    content: (
      <span>
        <strong>Tip:</strong> Use keyboard navigation
      </span>
    ),
    children: <button type="button">Focus or hover</button>,
  },
}

export const FourSides: Story = {
  name: 'Four sides',
  args: {
    content: 'Tooltip',
    children: <button type="button">Hover</button>,
  },
  parameters: {
    layout: 'centered',
  },
  render: () => (
    <div style={{ display: 'flex', gap: '16px', padding: '64px' }}>
      <Tooltip content="This appears on top" side="top">
        <button
          type="button"
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Top
        </button>
      </Tooltip>
      <Tooltip content="This appears on the right" side="right">
        <button
          type="button"
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Right
        </button>
      </Tooltip>
      <Tooltip content="This appears on the bottom" side="bottom">
        <button
          type="button"
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Bottom
        </button>
      </Tooltip>
      <Tooltip content="This appears on the left" side="left">
        <button
          type="button"
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          Left
        </button>
      </Tooltip>
    </div>
  ),
}
