'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Cmdo } from './cmdo'
import Orchestra from './orchestra'

// Dynamically load debug tools
const Studio = dynamic(
  () => import('./theatre/studio').then(({ Studio }) => Studio),
  { ssr: false }
)

const Stats = dynamic(() => import('./stats').then(({ Stats }) => Stats), {
  ssr: false,
})

const GridDebugger = dynamic(
  () => import('./grid').then(({ GridDebugger }) => GridDebugger),
  { ssr: false }
)

const ScrollTriggerDebugger = dynamic(
  () => import('hamo/scroll-trigger/debugger').then(({ Debugger }) => Debugger),
  { ssr: false }
)

const ReactScan = dynamic(
  () =>
    import('@/components/react-scan-provider').then(
      ({ ReactScanProvider }) => ReactScanProvider
    ),
  { ssr: false }
)

export function OrchestraTools() {
  const { stats, grid, studio, dev, minimap, screenshot, reactScan } =
    useOrchestra()

  useEffect(() => {
    document.documentElement.classList.toggle('dev', Boolean(dev))
  }, [dev])

  useEffect(() => {
    document.documentElement.classList.toggle('screenshot', Boolean(screenshot))
  }, [screenshot])

  return (
    <>
      <Cmdo />
      {studio && <Studio />}
      {stats && <Stats />}
      {grid && <GridDebugger />}
      {minimap && <ScrollTriggerDebugger />}
      {reactScan && <ReactScan />}
    </>
  )
}

export function useOrchestra() {
  const [state, setState] = useState<Record<string, boolean>>({})

  useEffect(() => {
    return Orchestra.subscribe(
      (state) => state,
      (state) => setState(state),
      {
        fireImmediately: true,
      }
    )
  }, [])

  return state
}
