'use client'

import { Menu } from '@/components/ui/menu'

export function MenuDemo() {
  return (
    <Menu.Root>
      <Menu.Trigger className="dr-rounded-8 dr-px-16 dr-py-10 bg-white/10 hover:bg-white/20">
        Open Menu
        <Menu.Arrow />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8}>
          <Menu.Popup>
            <Menu.Item onClick={() => console.log('Edit clicked')}>
              ✏️ Edit
            </Menu.Item>
            <Menu.Item onClick={() => console.log('Duplicate clicked')}>
              📋 Duplicate
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item onClick={() => console.log('Archive clicked')}>
              📦 Archive
            </Menu.Item>
            <Menu.Item onClick={() => console.log('Delete clicked')}>
              🗑️ Delete
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
