'use client'

import type { LenisOptions } from 'lenis'

import 'lenis/dist/lenis.css'
import type { LenisRef, LenisProps as ReactLenisProps } from 'lenis/react'
import { ReactLenis } from 'lenis/react'
import dynamic from 'next/dynamic'
import { useRef } from 'react'
import { useTempus } from 'tempus/react'

const LenisScrollTriggerSync = dynamic(
  () => import('./scroll-trigger').then((mod) => mod.LenisScrollTriggerSync),
  {
    ssr: false,
  }
)

interface LenisProps extends Omit<ReactLenisProps, 'ref'> {
  root: boolean
  options: LenisOptions
  syncScrollTrigger?: boolean
}

export function Lenis({
  root,
  options,
  syncScrollTrigger = false,
}: LenisProps) {
  const lenisRef = useRef<LenisRef>(null)

  // Tempus runs callbacks in ascending order inside one rAF. Lenis advances
  // the lerp and moves the document here, so anything that reads
  // `lenis.scroll` to draw must run after it, or it paints a frame behind the
  // DOM (a gap equal to the scroll velocity). Every explicit order, in one
  // place; a new `useTempus` callback picks one relative to these:
  //
  //   -Infinity  Stats.begin            lib/dev/stats
  //   -1         Lenis.raf              here
  //    1         WebGL RAF (advance)    lib/webgl/components/raf
  //    6         Marquee                components/ui/marquee
  //   10         GSAP updateRoot        components/effects/gsap.tsx
  //   1000       DOM write queue        lib/utils/raf.ts
  //   +Infinity  Stats.end              lib/dev/stats
  useTempus(
    ({ time }) => {
      if (lenisRef.current?.lenis) {
        lenisRef.current.lenis.raf(time)
      }
    },
    { order: -1 }
  )

  return (
    <ReactLenis
      ref={lenisRef}
      root={root}
      options={{
        ...options,
        lerp: options?.lerp ?? 0.125,
        autoRaf: false,
        anchors: true,
        autoToggle: true,
        prevent: (node: Element | null) =>
          node?.nodeName === 'VERCEL-LIVE-FEEDBACK' ||
          node?.id === 'theatrejs-studio-root' ||
          // react-scan renders its panel into a shadow root on this host;
          // composedPath() pierces the shadow boundary so the id is matchable.
          node?.id === 'react-scan-root',
      }}
    >
      {syncScrollTrigger && root && <LenisScrollTriggerSync />}
    </ReactLenis>
  )
}
