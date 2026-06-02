/**
 * Satus Homepage
 *
 * This page showcases Satus features. When using Satus as a template:
 * 1. Replace this content with your own homepage
 * 2. Delete the app/(marketing)/_sections folder
 *
 * Or keep it as inspiration for your own marketing pages!
 */
import type { Metadata } from 'next'
import { Wrapper } from '@/components/layout/wrapper'
import { Features } from './(marketing)/_sections/features'
import { GettingStarted } from './(marketing)/_sections/getting-started'
import { Hero } from './(marketing)/_sections/hero'
import { Presets } from './(marketing)/_sections/presets'
import { ValueProps } from './(marketing)/_sections/value-props'

export const metadata: Metadata = {
  title: 'Satūs — Next.js Starter by darkroom.engineering',
  description:
    'A production-ready Next.js 16 starter template featuring React 19, TypeScript, Tailwind v4, and best-practice integrations for Sanity, Shopify, and HubSpot.',
}

export default function Home() {
  return (
    <Wrapper theme="dark" lenis={{}} webgl>
      <Hero />
      <ValueProps />
      <Features />
      <Presets />
      <GettingStarted />
    </Wrapper>
  )
}
