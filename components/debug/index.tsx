'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useOrchestra } from '~/debug/react'

const Studio = dynamic(
  () => import('~/debug/theatre/studio').then(({ Studio }) => Studio),
  { ssr: false }
)
const Stats = dynamic(
  () => import('~/debug/stats').then(({ Stats }) => Stats),
  { ssr: false }
)
const GridDebugger = dynamic(
  () => import('~/debug/grid').then(({ GridDebugger }) => GridDebugger),
  { ssr: false }
)
const Minimap = dynamic(
  () => import('~/debug/minimap').then(({ Minimap }) => Minimap),
  { ssr: false }
)

export function Debug() {
  const { stats, grid, studio, dev, minimap } = useOrchestra()

  useEffect(() => {
    document.documentElement.classList.toggle('dev', dev)
  }, [dev])

  return (
    <>
      {studio && <Studio />}
      {stats && <Stats />}
      {grid && <GridDebugger />}
      {minimap && <Minimap />}
    </>
  )
}
