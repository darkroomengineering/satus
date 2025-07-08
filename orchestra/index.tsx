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
  const { stats, grid, studio, dev, minimap, _webgl } = useOrchestra()

  useEffect(() => {
    document.documentElement.classList.toggle('dev', dev)
  }, [dev])

  // Only render debug tools in development
  // if (process.env.NODE_ENV !== 'development') {
  //   return <Cmdo />
  // }

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
