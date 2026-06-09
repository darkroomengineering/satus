import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Switch } from './index'

const meta = {
  title: 'UI/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onCheckedChange: { action: 'checkedChange' },
  },
} satisfies Meta<typeof Switch>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Enable notifications',
  },
}

export const Controlled: Story = {
  render: () => {
    const [notifications, setNotifications] = useState(false)
    const [darkMode, setDarkMode] = useState(true)
    const [autoSave, setAutoSave] = useState(true)

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <Switch
          label="Notifications"
          checked={notifications}
          onCheckedChange={setNotifications}
        />
        <Switch
          label="Dark mode"
          checked={darkMode}
          onCheckedChange={setDarkMode}
        />
        <Switch
          label="Auto-save"
          checked={autoSave}
          onCheckedChange={setAutoSave}
        />
      </div>
    )
  },
}

export const Disabled: Story = {
  args: {
    label: 'Disabled switch',
    disabled: true,
  },
}

export const DisabledOn: Story = {
  args: {
    label: 'Disabled (on)',
    checked: true,
    disabled: true,
  },
}
