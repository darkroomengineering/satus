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

const Minimap = dynamic(
  () => import('./minimap').then(({ Minimap }) => Minimap),
  { ssr: false }
)

export function OrchestraTools() {
  const { stats, grid, studio, dev, minimap, screenshot } = useOrchestra()

  useEffect(() => {
    document.documentElement.classList.toggle('dev', Boolean(dev))
  }, [dev])

  useEffect(() => {
    document.documentElement.classList.toggle('screenshot', Boolean(screenshot))
  }, [screenshot])

  // Only render debug tools in development to reduce production bundle size
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <>
      <Cmdo />
      {studio && <Studio />}
      {stats && <Stats />}
      {grid && <GridDebugger />}
      {minimap && <Minimap />}
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
