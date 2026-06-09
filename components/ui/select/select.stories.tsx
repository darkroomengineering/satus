import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Select } from './index'

const meta = {
  title: 'UI/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onValueChange: { action: 'valueChanged' },
  },
} satisfies Meta<typeof Select>

export default meta

type Story = StoryObj<typeof meta>

const COLOR_OPTIONS = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
] as const

export const Default: Story = {
  args: {
    options: COLOR_OPTIONS,
    placeholder: 'Pick a colour',
  },
}

export const WithLabel: Story = {
  args: {
    label: 'Favourite colour',
    options: COLOR_OPTIONS,
    placeholder: 'Pick a colour',
    defaultValue: 'blue',
  },
}

export const Disabled: Story = {
  args: {
    options: COLOR_OPTIONS,
    placeholder: 'Pick a colour',
    disabled: true,
  },
}

const FRUIT_OPTIONS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'orange', label: 'Orange' },
  { value: 'grape', label: 'Grape' },
  { value: 'strawberry', label: 'Strawberry' },
] as const

export const ControlledFruits: Story = {
  name: 'Controlled (fruits)',
  render: () => {
    const [value, setValue] = useState<string>()

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          minWidth: 200,
        }}
      >
        <Select
          options={FRUIT_OPTIONS}
          value={value ?? ''}
          onValueChange={setValue}
          placeholder="Choose a fruit..."
        />
        {value && (
          <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>
            Selected: {value}
          </p>
        )}
      </div>
    )
  },
}
