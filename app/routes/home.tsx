import type { Route } from './+types/home'
import { Features } from './home/features'
import { GettingStarted } from './home/getting-started'
import { Hero } from './home/hero'
import { Presets } from './home/presets'
import { ValueProps } from './home/value-props'

export function meta(_args: Route.MetaArgs) {
  return [
    { title: 'Satus' },
    {
      name: 'description',
      content:
        'React Router starter by darkroom.engineering — React 19, TypeScript strict, Tailwind v4',
    },
  ]
}

export default function Home() {
  return (
    <>
      <Hero />
      <ValueProps />
      <Features />
      <Presets />
      <GettingStarted />
    </>
  )
}
