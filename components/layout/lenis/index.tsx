'use client'

import gsap from 'gsap'
import { ScrollTrigger as GSAPScrollTrigger } from 'gsap/all'
import type { LenisOptions } from 'lenis'
import 'lenis/dist/lenis.css'
import type { LenisRef, LenisProps as ReactLenisProps } from 'lenis/react'
import { ReactLenis, useLenis } from 'lenis/react'
import { useEffect, useEffectEvent, useRef } from 'react'
import { useTempus } from 'tempus/react'
import { useStore } from '~/hooks/store'

// Register ScrollTrigger once
if (typeof window !== 'undefined') {
  gsap.registerPlugin(GSAPScrollTrigger)
  GSAPScrollTrigger.clearScrollMemory('manual')
  GSAPScrollTrigger.defaults({
    markers: process.env.NODE_ENV === 'development',
  })
}

/**
 * Syncs GSAP ScrollTrigger with Lenis scroll position.
 * Must be rendered inside ReactLenis context.
 */
function LenisScrollTriggerSync() {
  const handleUpdate = useEffectEvent(() => {
    GSAPScrollTrigger.update()
  })

  const handleRefresh = useEffectEvent(() => {
    GSAPScrollTrigger.refresh()
  })

  const lenis = useLenis(handleUpdate)

  useEffect(() => {
    if (lenis) {
      handleRefresh()
    }
  }, [lenis])

  return null
}

interface LenisProps extends Omit<ReactLenisProps, 'ref'> {
  root: boolean
  options: LenisOptions
}

export function Lenis({ root, options }: LenisProps) {
  const lenisRef = useRef<LenisRef>(null)
  const isNavOpened = useStore((state) => state.isNavOpened)

  useTempus((time: number) => {
    if (lenisRef.current?.lenis) {
      lenisRef.current.lenis.raf(time)
    }
  })

  useEffect(() => {
    const isOverflowHidden = isNavOpened
    document.documentElement.classList.toggle(
      'overflow-hidden',
      isOverflowHidden
    )
  }, [isNavOpened])

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
          node?.id === 'theatrejs-studio-root',
      }}
    >
      {root && <LenisScrollTriggerSync />}
    </ReactLenis>
  )
}
