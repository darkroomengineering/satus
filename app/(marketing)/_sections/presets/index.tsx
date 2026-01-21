'use client'

import cn from 'clsx'
import { Marquee } from '@/components/ui/marquee'
import s from './presets.module.css'

const PRESETS = [
  {
    name: 'Editorial',
    description: 'Content-focused sites with Sanity CMS and HubSpot forms.',
    features: ['Sanity CMS', 'HubSpot Forms', 'Newsletter'],
    icon: '📰',
  },
  {
    name: 'Studio',
    description: 'Creative agency portfolio with WebGL and all integrations.',
    features: ['WebGL', 'All Integrations', 'Theatre.js'],
    icon: '🎨',
  },
  {
    name: 'Boutique',
    description: 'E-commerce storefront with Shopify and marketing tools.',
    features: ['Shopify', 'Cart & Checkout', 'HubSpot'],
    icon: '🛍️',
  },
  {
    name: 'Gallery',
    description: 'Image-heavy sites with optimized media and minimal UI.',
    features: ['Image Optimization', 'Lazy Loading', 'Minimal'],
    icon: '🖼️',
  },
  {
    name: 'Blank',
    description: 'Clean slate with just Next.js, React, and Tailwind.',
    features: ['Core Only', 'No Integrations', 'Minimal'],
    icon: '📄',
  },
] as const

function PresetCard({ preset }: { preset: (typeof PRESETS)[number] }) {
  return (
    <div className={s.card}>
      <span className={s.icon}>{preset.icon}</span>
      <h3 className={s.cardTitle}>{preset.name}</h3>
      <p className={s.cardDescription}>{preset.description}</p>
      <div className={s.cardFeatures}>
        {preset.features.map((feature) => (
          <span key={feature} className={s.cardFeature}>
            {feature}
          </span>
        ))}
      </div>
    </div>
  )
}

export function Presets() {
  return (
    <section className={s.section}>
      <div className="dr-layout-grid">
        <header
          className={cn(s.header, 'col-span-full dt:col-start-3 dt:col-end-11')}
        >
          <h2 className={s.title}>Start with a Preset</h2>
          <p className={s.subtitle}>
            Choose your stack with{' '}
            <code className={s.code}>bun run setup:project</code>
          </p>
        </header>
      </div>

      <Marquee className={s.marquee} speed={0.3} pauseOnHover repeat={3}>
        <div className={s.marqueeContent}>
          {PRESETS.map((preset) => (
            <PresetCard key={preset.name} preset={preset} />
          ))}
        </div>
      </Marquee>

      <div className="dr-layout-grid">
        <p className={cn(s.hint, 'col-span-full dt:col-start-3 dt:col-end-11')}>
          Or choose <strong>Custom</strong> to pick individual integrations.
        </p>
      </div>
    </section>
  )
}
