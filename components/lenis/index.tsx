import type { LenisOptions } from 'lenis'
import 'lenis/dist/lenis.css'
import type { LenisRef, LenisProps as ReactLenisProps } from 'lenis/react'
import { ReactLenis } from 'lenis/react'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { useTempus } from 'tempus/react'
import { useStore } from '@/hooks/store'

const LenisScrollTriggerSync = lazy(() =>
  import('./scroll-trigger').then((mod) => ({
    default: mod.LenisScrollTriggerSync,
  }))
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
  const isNavOpened = useStore(
    (state: { isNavOpened: boolean }) => state.isNavOpened
  )

  useTempus((time: number) => {
    if (lenisRef.current?.lenis) {
      lenisRef.current.lenis.raf(time)
    }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('overflow-hidden', isNavOpened)
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
      {syncScrollTrigger && root && (
        <Suspense fallback={null}>
          <LenisScrollTriggerSync />
        </Suspense>
      )}
    </ReactLenis>
  )
}
