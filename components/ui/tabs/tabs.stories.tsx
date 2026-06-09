import type { Meta, StoryObj } from '@storybook/react'
import { Tabs } from './index'

const meta = {
  title: 'UI/Tabs',
  component: Tabs.Root,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs.Root>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div style={{ width: 400 }}>
      <Tabs.Root defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="features">Features</Tabs.Tab>
          <Tabs.Tab value="docs">Docs</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>

        <Tabs.Panel value="overview">
          <p style={{ opacity: 0.7 }}>
            A Next.js starter template designed for building high-performance
            websites with modern tooling.
          </p>
        </Tabs.Panel>

        <Tabs.Panel value="features">
          <ul style={{ opacity: 0.7, paddingLeft: '1.25rem' }}>
            <li>Next.js with App Router</li>
            <li>React 19 with Activity</li>
            <li>Tailwind CSS v4</li>
            <li>Base UI components</li>
            <li>WebGL support</li>
          </ul>
        </Tabs.Panel>

        <Tabs.Panel value="docs">
          <p style={{ opacity: 0.7 }}>
            Check out the README.md and component documentation for detailed
            usage instructions and examples.
          </p>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  ),
}

export const TwoTabs: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <Tabs.Root defaultValue="tab1">
        <Tabs.List>
          <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
          <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Panel value="tab1">Content for tab 1</Tabs.Panel>
        <Tabs.Panel value="tab2">Content for tab 2</Tabs.Panel>
      </Tabs.Root>
    </div>
  ),
}
