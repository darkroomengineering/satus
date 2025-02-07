'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useOrchestra } from '~/app/debug/orchestra/react'

const Studio = dynamic(
  () => import('~/app/theatre/studio').then(({ Studio }) => Studio),
  { ssr: false }
)
const Stats = dynamic(
  () => import('~/app/debug/orchestra/stats').then(({ Stats }) => Stats),
  { ssr: false }
)
const GridDebugger = dynamic(
  () =>
    import('~/app/debug/orchestra/grid').then(
      ({ GridDebugger }) => GridDebugger
    ),
  { ssr: false }
)
const Minimap = dynamic(
  () => import('~/app/debug/orchestra/minimap').then(({ Minimap }) => Minimap),
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
