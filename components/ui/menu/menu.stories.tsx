import type { Meta, StoryObj } from '@storybook/react'
import { Menu } from './index'

const meta = {
  title: 'UI/Menu',
  component: Menu.Root,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Menu.Root>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Menu.Root>
      <Menu.Trigger style={{ padding: '8px 16px', cursor: 'pointer' }}>
        Open Menu
        <Menu.Arrow />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8}>
          <Menu.Popup>
            <Menu.Item onClick={() => console.log('Edit clicked')}>
              Edit
            </Menu.Item>
            <Menu.Item onClick={() => console.log('Duplicate clicked')}>
              Duplicate
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item onClick={() => console.log('Archive clicked')}>
              Archive
            </Menu.Item>
            <Menu.Item onClick={() => console.log('Delete clicked')}>
              Delete
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  ),
}
