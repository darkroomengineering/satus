'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Cmdo } from './cmdo'
import Orchestra from './orchestra'

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
  const { stats, grid, studio, dev, minimap, webgl } = useOrchestra()

  console.log({ stats, webgl })

  useEffect(() => {
    document.documentElement.classList.toggle('dev', dev)
  }, [dev])

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
