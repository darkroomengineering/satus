'use client'

import cn from 'clsx'
import { Marquee } from '@/components/ui/marquee'
import s from './presets.module.css'

const PRESETS = [
  {
    name: 'Editorial',
    description: 'Sanity CMS + HubSpot forms',
  },
  {
    name: 'Studio',
    description: 'WebGL + all integrations',
  },
  {
    name: 'Boutique',
    description: 'Shopify + marketing tools',
  },
  {
    name: 'Gallery',
    description: 'Optimized media + minimal UI',
  },
  {
    name: 'Blank',
    description: 'Core only, no integrations',
  },
] as const

function PresetCard({ preset }: { preset: (typeof PRESETS)[number] }) {
  return (
    <div className={s.card}>
      <span className={s.cardTitle}>{preset.name}</span>
      <span className={s.cardDescription}>{preset.description}</span>
    </div>
  )
}

export function Presets() {
  return (
    <section className={s.section}>
      <Marquee className={s.marquee} speed={0.4} pauseOnHover repeat={4}>
        <div className={s.marqueeContent}>
          {PRESETS.map((preset) => (
            <PresetCard key={preset.name} preset={preset} />
          ))}
        </div>
      </Marquee>

      <div className="dr-layout-grid">
        <p className={cn(s.hint, 'col-span-full dt:col-start-2 dt:col-end-12')}>
          Run <code className={s.code}>bun run setup:project</code> to choose
        </p>
      </div>
    </section>
  )
}
