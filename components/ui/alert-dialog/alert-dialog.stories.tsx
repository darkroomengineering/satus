import type { Meta, StoryObj } from '@storybook/react'
import { AlertDialog } from './index'

const meta = {
  title: 'UI/AlertDialog',
  component: AlertDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onConfirm: { action: 'confirmed' },
    onCancel: { action: 'cancelled' },
  },
} satisfies Meta<typeof AlertDialog>

export default meta

type Story = StoryObj<typeof meta>

export const Confirm: Story = {
  args: {
    trigger: (
      <button type="button" style={{ padding: '8px 16px', cursor: 'pointer' }}>
        Confirm Action
      </button>
    ),
    title: 'Are you sure?',
    description: 'This action will save your changes and cannot be undone.',
    confirmLabel: 'Save',
  },
}

export const Destructive: Story = {
  args: {
    trigger: (
      <button type="button" style={{ padding: '8px 16px', cursor: 'pointer' }}>
        Delete Item
      </button>
    ),
    title: 'Delete this item?',
    description:
      'This will permanently delete the item. This action cannot be undone.',
    confirmLabel: 'Delete',
    destructive: true,
  },
}
