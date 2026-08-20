/**
 * @module flowmap-provider
 *
 * Provides GPU-based mouse/pointer interaction effects through React context.
 *
 * Two simulation types are available:
 * - **Flowmap** -- a texture-based velocity field that displaces geometry or
 *   UVs based on pointer movement. Ideal for image distortion effects.
 * - **Fluid** -- a full Navier-Stokes fluid simulation that produces
 *   organic, ink-like trails. More expensive but visually richer.
 *
 * Both simulations run entirely on the GPU via custom shaders and are
 * updated each frame inside the R3F render loop.
 */

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
 * Shape of the flowmap context value.
 *
 * The simulations are held in refs (not state) because they're mutated
 * imperatively every frame — reading `.current` gives the latest instance
 * without ever triggering a re-render.
 *
 * @property fluid - Ref to the GPU fluid simulation instance (Navier-Stokes).
 * @property flowmap - Ref to the GPU flowmap simulation instance (velocity-field displacement).
 * @property subscribePointerMove - Shared window pointer-move subscription
 *   (see `usePointerInputSubscribe`), mounted once in `FlowmapProvider` so
 *   `fluid` and `flowmap` sims don't each mount their own window listeners.
 *   `null` when no sim is active (`simTypes` empty).
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
 * Retrieves the active GPU simulation instance ref from context.
 *
 * Must be called inside a {@link FlowmapProvider} (which itself must be
 * inside the R3F `<Canvas>` tree, since the simulations depend on the
 * WebGL renderer).
 *
 * @param type - Which simulation to return.
 *   - `'flowmap'` (default) -- lightweight velocity-field displacement.
 *   - `'fluid'` -- full Navier-Stokes fluid simulation.
 * @returns A ref to the requested simulation instance (`Fluid` or `Flowmap`).
 *   Read `.current` inside an effect, event handler, or `useFrame` callback —
 *   never during render.
 *
 * @example
 * ```tsx
 * function DistortedImage() {
 *   const flowmapRef = useFlowmap('flowmap')
 *   // Use flowmapRef.current?.texture as a uniform in a custom shader
 * }
 *
 * function FluidBackground() {
 *   const fluidRef = useFlowmap('fluid')
 *   // Use fluidRef.current?.density / fluidRef.current?.velocity textures
 * }
 * ```
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

/**
 * Mounts the shared pointer-move subscription once and puts it on context —
 * only rendered when at least one sim is opted in (see `FlowmapProvider`
 * below), so a page with `simTypes` empty pays for zero window listeners.
 */
function PointerInputBus({ children }: { children: React.ReactNode }) {
  const subscribePointerMove = usePointerInputSubscribe()
  const parent = use(FlowmapContext)
  return (
    <FlowmapContext.Provider value={{ ...parent, subscribePointerMove }}>
      {children}
    </FlowmapContext.Provider>
  )
}

/**
 * Initializes and provides GPU simulations via React context.
 *
 * **Must be placed inside the R3F `<Canvas>` tree** because the underlying
 * hooks (`useFluidSim`, `useFlowmapSim`) depend on the Three.js WebGL
 * renderer and the R3F frame loop.
 *
 * @param props.children - R3F elements that need access to the simulations.
 * @param props.simTypes - Which simulations to mount. Defaults to none
 *   (opt-in) — mounting a GPU sim without a consumer wastes a render pass
 *   and window listeners. Pass the sims you actually use — e.g.
 *   `simTypes={['fluid']}`.
 * @returns A context provider wrapping the children.
 *
 * @example
 * ```tsx
 * // Opt into the fluid sim
 * <Canvas>
 *   <FlowmapProvider simTypes={['fluid']}>
 *     <FluidBackground />
 *   </FlowmapProvider>
 * </Canvas>
 *
 * // Opt into both
 * <Canvas>
 *   <FlowmapProvider simTypes={['fluid', 'flowmap']}>
 *     <DistortedPlane />
 *   </FlowmapProvider>
 * </Canvas>
 * ```
 */
// Hoisted so the default is referentially stable across renders.
const NO_SIM_TYPES: ('fluid' | 'flowmap')[] = []

export function FlowmapProvider({
  children,
  simTypes = NO_SIM_TYPES,
}: {
  children: React.ReactNode
  /** Which simulations to mount. Default: none (opt-in). */
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
