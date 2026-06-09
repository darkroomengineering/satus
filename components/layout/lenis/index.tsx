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

  useTempus((time: number) => {
    if (lenisRef.current?.lenis) {
      lenisRef.current.lenis.raf(time)
    }
  })

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
