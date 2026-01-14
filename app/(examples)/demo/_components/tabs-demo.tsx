'use client'

import { Tabs } from '@/components/ui/tabs'

export function TabsDemo() {
  return (
    <div className="w-full max-w-md">
      <Tabs.Root defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="features">Features</Tabs.Tab>
          <Tabs.Tab value="docs">Docs</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>

        <Tabs.Panel value="overview">
          <p className="opacity-70">
            Satūs is a Next.js starter template designed for building
            high-performance websites with modern tooling.
          </p>
        </Tabs.Panel>

        <Tabs.Panel value="features">
          <ul className="list-disc pl-5 opacity-70">
            <li>Next.js 16 with App Router</li>
            <li>React 19 with Activity</li>
            <li>Tailwind CSS v4</li>
            <li>Base UI components</li>
            <li>WebGL support</li>
          </ul>
        </Tabs.Panel>

        <Tabs.Panel value="docs">
          <p className="opacity-70">
            Check out the README.md and component documentation for detailed
            usage instructions and examples.
          </p>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}
