'use client'

import { useOrchestra } from 'libs/orchestra/react'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'

const Studio = dynamic(
  () => import('libs/theatre/studio').then(({ Studio }) => Studio),
  { ssr: false },
)

const Stats = dynamic(
  () => import('libs/orchestra/stats').then(({ Stats }) => Stats),
  {
    ssr: false,
  },
)
const GridDebugger = dynamic(
  () => import('libs/orchestra/grid').then(({ GridDebugger }) => GridDebugger),
  {
    ssr: false,
  },
)

const Minimap = dynamic(
  () => import('libs/orchestra/minimap').then(({ Minimap }) => Minimap),
  {
    ssr: false,
  },
)

export function Debug() {
  const { stats, grid, studio, dev, minimap } = useOrchestra()

  useEffect(() => {
    document.documentElement.classList.toggle('dev', Boolean(dev))
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
