import type { Route } from './+types/home'

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

// TODO Phase 2+: once styles and components are ported, restore full marketing page
// import { Hero } from './home/hero'
// import { ValueProps } from './home/value-props'
// import { Features } from './home/features'
// import { Presets } from './home/presets'
// import { GettingStarted } from './home/getting-started'

export default function Home() {
  return (
    <main>
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <h1
          style={{
            fontSize: '2rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          satus
        </h1>
        <p style={{ opacity: 0.5 }}>
          react router framework mode — styles coming in phase 2
        </p>
      </section>
    </main>
  )
}
