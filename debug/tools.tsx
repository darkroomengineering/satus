'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { Cmdk } from './cmdk'
import { useOrchestra } from './toggle'

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

export function DebugTools() {
  const { stats, grid, studio, dev, minimap } = useOrchestra()

  useEffect(() => {
    document.documentElement.classList.toggle('dev', dev)
  }, [dev])

  return (
    <>
      <Cmdk />
      {studio && <Studio />}
      {stats && <Stats />}
      {grid && <GridDebugger />}
      {minimap && <Minimap />}
    </>
  )
}
