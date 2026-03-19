/**
 * Satus Homepage
 *
 * This page showcases Satus features. When using Satus as a template:
 * 1. Replace this content with your own homepage
 * 2. Delete the app/(marketing)/_sections folder
 *
 * Or keep it as inspiration for your own marketing pages!
 */
import { Analytics } from '@vercel/analytics/react'
import { Wrapper } from '@/components/layout/wrapper'
import { Features } from './(marketing)/_sections/features'
import { GettingStarted } from './(marketing)/_sections/getting-started'
import { Hero } from './(marketing)/_sections/hero'
import { Presets } from './(marketing)/_sections/presets'
import { ValueProps } from './(marketing)/_sections/value-props'

export default function Home() {
  return (
    <Wrapper theme="dark" lenis={{}}>
      <Hero />
      <ValueProps />
      <Features />
      <Presets />
      <GettingStarted />
      <Analytics />
    </Wrapper>
  )
}
