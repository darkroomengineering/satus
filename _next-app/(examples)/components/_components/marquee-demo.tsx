'use client'

import { Marquee } from '@/components/ui/marquee'

export function MarqueeDemo() {
  return (
    <div className="w-full overflow-hidden">
      <Marquee speed={0.5} repeat={4} className="dr-py-8">
        <span className="dr-px-8">✦ Satūs Starter Kit</span>
        <span className="dr-px-8">✦ Next.js 16</span>
        <span className="dr-px-8">✦ React 19</span>
        <span className="dr-px-8">✦ Tailwind CSS v4</span>
        <span className="dr-px-8">✦ Base UI</span>
        <span className="dr-px-8">✦ WebGL Ready</span>
      </Marquee>
      <Marquee speed={0.3} repeat={4} reversed className="dr-py-8 opacity-50">
        <span className="dr-px-8">→ Build Fast</span>
        <span className="dr-px-8">→ Ship Faster</span>
        <span className="dr-px-8">→ Scale Better</span>
        <span className="dr-px-8">→ Stay Creative</span>
      </Marquee>
    </div>
  )
}
