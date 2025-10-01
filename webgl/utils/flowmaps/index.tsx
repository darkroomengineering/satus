import { useFrame, useThree } from '@react-three/fiber'
import { types } from '@theatre/core'
import { useCurrentSheet } from '~/orchestra/theatre'
import { useTheatre } from '~/orchestra/theatre/hooks/use-theatre'
import { Flowmap } from '~/webgl/utils/flowmaps/flowmap-sim'

export function useFlowmapSim() {
  const sheet = useCurrentSheet()
  const gl = useThree((state) => state.gl)
  // React Compiler handles memoization automatically
  const flowmap = new Flowmap(gl, { size: 128 })

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
