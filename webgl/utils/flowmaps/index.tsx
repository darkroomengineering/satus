import { useFrame, useThree } from '@react-three/fiber'
import { types } from '@theatre/core'
import { useRef } from 'react'
import { useCurrentSheet } from '~/orchestra/theatre'
import { useTheatre } from '~/orchestra/theatre/hooks/use-theatre'
import { Flowmap } from '~/webgl/utils/flowmaps/flowmap-sim'

export function useFlowmapSim() {
  const sheet = useCurrentSheet()
  const gl = useThree((state) => state.gl)

  // Use ref to ensure flowmap is only created once
  const flowmapRef = useRef<Flowmap | null>(null)
  if (!flowmapRef.current) {
    flowmapRef.current = new Flowmap(gl, { size: 128 })
  }
  const flowmap = flowmapRef.current

  useTheatre(
    sheet,
    'flowmap',
    {
      falloff: types.number(0.2, { range: [0, 1], nudgeMultiplier: 0.01 }),
      dissipation: types.number(0.98, { range: [0, 1], nudgeMultiplier: 0.01 }),
    },
    {
      onValuesChange: ({
        falloff,
        dissipation,
      }: {
        falloff: number
        dissipation: number
      }) => {
        flowmap.falloff = falloff
        flowmap.dissipation = dissipation
      },
      deps: [flowmap],
    }
  )

  useFrame(() => {
    flowmap.update()
  }, -10)

  return flowmap
}
