'use client'

import type { LenisOptions } from 'lenis'
import 'lenis/dist/lenis.css'
import type { LenisRef, LenisProps as ReactLenisProps } from 'lenis/react'
import { ReactLenis } from 'lenis/react'
import { useEffect, useRef } from 'react'
import { useTempus } from 'tempus/react'
import { useStore } from '~/libs/store'

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
    />
  )
}
