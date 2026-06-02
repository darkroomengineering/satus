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
