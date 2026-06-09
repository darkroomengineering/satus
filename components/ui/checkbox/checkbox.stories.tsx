import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Checkbox } from './index'

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onCheckedChange: { action: 'checkedChange' },
  },
} satisfies Meta<typeof Checkbox>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Accept terms and conditions',
  },
}

export const Controlled: Story = {
  render: () => {
    const [terms, setTerms] = useState(false)
    const [marketing, setMarketing] = useState(true)
    const [updates, setUpdates] = useState(false)

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <Checkbox label="Terms" checked={terms} onCheckedChange={setTerms} />
        <Checkbox
          label="Marketing"
          checked={marketing}
          onCheckedChange={setMarketing}
        />
        <Checkbox
          label="Updates"
          checked={updates}
          onCheckedChange={setUpdates}
        />
      </div>
    )
  },
}

export const Disabled: Story = {
  args: {
    label: 'Disabled checkbox',
    disabled: true,
  },
}

export const DisabledChecked: Story = {
  args: {
    label: 'Disabled (checked)',
    checked: true,
    disabled: true,
  },
}
