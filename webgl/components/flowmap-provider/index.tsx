import { createContext, useContext } from 'react'
import { useFlowmapSim } from '~/webgl/utils/flowmaps'
import type { Flowmap } from '~/webgl/utils/flowmaps/flowmap-sim'
import { useFluidSim } from '~/webgl/utils/fluid'
import type { Fluid } from '~/webgl/utils/fluid/fluid-sim'

type FlowmapContextType = {
  fluid: Fluid
  flowmap: Flowmap
}

export const FlowmapContext = createContext<FlowmapContextType>(
  {} as FlowmapContextType
)

export function useFlowmap(type: 'fluid' | 'flowmap' = 'flowmap') {
  const { fluid, flowmap } = useContext(FlowmapContext)

  if (type === 'fluid') return fluid
  return flowmap
}

export function FlowmapProvider({ children }: { children: React.ReactNode }) {
  const fluid = useFluidSim()
  const flowmap = useFlowmapSim()

  return (
    <FlowmapContext.Provider value={{ fluid, flowmap }}>
      {children}
    </FlowmapContext.Provider>
  )
}
