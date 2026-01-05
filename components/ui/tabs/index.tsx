'use client'

import { Tabs as BaseTabs } from '@base-ui/react/tabs'
import cn from 'clsx'
import type { ComponentProps, ReactNode } from 'react'
import s from './tabs.module.css'

/**
 * Tabs component built on Base UI for accessible tab navigation.
 *
 * @example
 * ```tsx
 * <Tabs.Root defaultValue="tab1">
 *   <Tabs.List>
 *     <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
 *     <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
 *   </Tabs.List>
 *   <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
 *   <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
 * </Tabs.Root>
 * ```
 *
 * @example
 * ```tsx
 * // Controlled mode
 * const [tab, setTab] = useState('settings')
 *
 * <Tabs.Root value={tab} onValueChange={setTab}>
 *   <Tabs.List>
 *     <Tabs.Tab value="profile">Profile</Tabs.Tab>
 *     <Tabs.Tab value="settings">Settings</Tabs.Tab>
 *   </Tabs.List>
 *   <Tabs.Panel value="profile">Profile content</Tabs.Panel>
 *   <Tabs.Panel value="settings">Settings content</Tabs.Panel>
 * </Tabs.Root>
 * ```
 */

// Root
const Root = BaseTabs.Root

// List (tab buttons container)
type ListProps = ComponentProps<typeof BaseTabs.List> & {
  className?: string
}

function List({ className, ...props }: ListProps) {
  return <BaseTabs.List className={cn(s.list, className)} {...props} />
}

// Tab (individual tab button)
type TabProps = ComponentProps<typeof BaseTabs.Tab> & {
  className?: string
}

function Tab({ className, ...props }: TabProps) {
  return <BaseTabs.Tab className={cn(s.tab, className)} {...props} />
}

// Indicator (animated underline)
type IndicatorProps = ComponentProps<typeof BaseTabs.Indicator> & {
  className?: string
}

function Indicator({ className, ...props }: IndicatorProps) {
  return (
    <BaseTabs.Indicator className={cn(s.indicator, className)} {...props} />
  )
}

// Panel
type PanelProps = ComponentProps<typeof BaseTabs.Panel> & {
  className?: string
  children?: ReactNode
}

function Panel({ className, children, ...props }: PanelProps) {
  return (
    <BaseTabs.Panel className={cn(s.panel, className)} {...props}>
      {children}
    </BaseTabs.Panel>
  )
}

export const Tabs = {
  Root,
  List,
  Tab,
  Indicator,
  Panel,
}

export {
  Indicator as TabsIndicator,
  List as TabsList,
  Panel as TabsPanel,
  Root as TabsRoot,
  Tab as TabsTab,
}
