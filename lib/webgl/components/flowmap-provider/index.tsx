import { createContext, type RefObject, use } from 'react'

import {
  type PointerMoveHandler,
  usePointerInputSubscribe,
} from '@/webgl/hooks/use-pointer-input'
import { useFlowmapSim } from '@/webgl/utils/flowmaps'
import type { Flowmap } from '@/webgl/utils/flowmaps/flowmap-sim'
import { useFluidSim } from '@/webgl/utils/fluid'
import type { Fluid } from '@/webgl/utils/fluid/fluid-sim'

/**
 * The sims are refs (not state) because they're mutated imperatively every
 * frame. `subscribePointerMove` is one shared window listener mounted by
 * `FlowmapProvider`, so the sims don't each add their own; `null` when no sim
 * is active.
 */
type FlowmapContextType = {
  fluid: RefObject<Fluid | null> | null
  flowmap: RefObject<Flowmap | null> | null
  subscribePointerMove: ((handler: PointerMoveHandler) => () => void) | null
}

export const FlowmapContext = createContext<FlowmapContextType>({
  fluid: null,
  flowmap: null,
  subscribePointerMove: null,
})

/**
 * Must be called inside a {@link FlowmapProvider}. Read `.current` inside an
 * effect, event handler, or `useFrame` callback, never during render.
 */
export function useFlowmap(type: 'fluid' | 'flowmap' = 'flowmap') {
  const { fluid, flowmap } = use(FlowmapContext)

  if (type === 'fluid') return fluid
  return flowmap
}

function FluidSimInner({ children }: { children: React.ReactNode }) {
  const parent = use(FlowmapContext)
  const fluid = useFluidSim(undefined, parent.subscribePointerMove)
  return (
    <FlowmapContext.Provider value={{ ...parent, fluid }}>
      {children}
    </FlowmapContext.Provider>
  )
}

function FlowmapSimInner({ children }: { children: React.ReactNode }) {
  const parent = use(FlowmapContext)
  const flowmap = useFlowmapSim(undefined, parent.subscribePointerMove)
  return (
    <FlowmapContext.Provider value={{ ...parent, flowmap }}>
      {children}
    </FlowmapContext.Provider>
  )
}

// Rendered only when a sim is opted in, so `simTypes` empty pays for zero
// window listeners.
function PointerInputBus({ children }: { children: React.ReactNode }) {
  const subscribePointerMove = usePointerInputSubscribe()
  const parent = use(FlowmapContext)
  return (
    <FlowmapContext.Provider value={{ ...parent, subscribePointerMove }}>
      {children}
    </FlowmapContext.Provider>
  )
}

// Hoisted so the default is referentially stable across renders.
const NO_SIM_TYPES: ('fluid' | 'flowmap')[] = []

/**
 * Must be inside the R3F `<Canvas>` tree: the sim hooks need the renderer and
 * frame loop. `simTypes` defaults to none, since a sim without a consumer
 * wastes a render pass and window listeners.
 */
export function FlowmapProvider({
  children,
  simTypes = NO_SIM_TYPES,
}: {
  children: React.ReactNode
  simTypes?: ('fluid' | 'flowmap')[]
}) {
  let tree = children
  if (simTypes.includes('flowmap')) {
    tree = <FlowmapSimInner>{tree}</FlowmapSimInner>
  }
  if (simTypes.includes('fluid')) {
    tree = <FluidSimInner>{tree}</FluidSimInner>
  }
  if (simTypes.length > 0) {
    tree = <PointerInputBus>{tree}</PointerInputBus>
  }
  return (
    <FlowmapContext.Provider
      value={{ fluid: null, flowmap: null, subscribePointerMove: null }}
    >
      {tree}
    </FlowmapContext.Provider>
  )
}
