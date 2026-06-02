import type { Meta, StoryObj } from '@storybook/react'
import { Dropdown } from './index'

const meta = {
  title: 'UI/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onChange: { action: 'changed' },
  },
} satisfies Meta<typeof Dropdown>

export default meta

type Story = StoryObj<typeof meta>

const FRUITS = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'] as const

export const Default: Story = {
  args: {
    options: FRUITS,
    placeholder: 'Select a fruit',
  },
}

export const WithDefaultValue: Story = {
  args: {
    options: FRUITS,
    placeholder: 'Select a fruit',
    defaultValue: 1,
  },
}

export const FewOptions: Story = {
  args: {
    options: ['Yes', 'No'] as const,
    placeholder: 'Choose…',
  },
}
