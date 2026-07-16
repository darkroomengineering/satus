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

import { createContext, use } from 'react'
import { useFlowmapSim } from '@/webgl/utils/flowmaps'
import type { Flowmap } from '@/webgl/utils/flowmaps/flowmap-sim'
import { useFluidSim } from '@/webgl/utils/fluid'
import type { Fluid } from '@/webgl/utils/fluid/fluid-sim'

/**
 * Shape of the flowmap context value.
 *
 * @property fluid - The GPU fluid simulation instance (Navier-Stokes).
 * @property flowmap - The GPU flowmap simulation instance (velocity-field displacement).
 */
type FlowmapContextType = {
  fluid: Fluid | null
  flowmap: Flowmap | null
}

export const FlowmapContext = createContext<FlowmapContextType>({
  fluid: null,
  flowmap: null,
})

/**
 * Retrieves the active GPU simulation instance from context.
 *
 * Must be called inside a {@link FlowmapProvider} (which itself must be
 * inside the R3F `<Canvas>` tree, since the simulations depend on the
 * WebGL renderer).
 *
 * @param type - Which simulation to return.
 *   - `'flowmap'` (default) -- lightweight velocity-field displacement.
 *   - `'fluid'` -- full Navier-Stokes fluid simulation.
 * @returns The requested simulation instance (`Fluid` or `Flowmap`).
 *
 * @example
 * ```tsx
 * function DistortedImage() {
 *   const flowmap = useFlowmap('flowmap')
 *   // Use flowmap.texture as a uniform in a custom shader
 * }
 *
 * function FluidBackground() {
 *   const fluid = useFlowmap('fluid')
 *   // Use fluid.density / fluid.velocity textures
 * }
 * ```
 */
export function useFlowmap(type: 'fluid' | 'flowmap' = 'flowmap') {
  const { fluid, flowmap } = use(FlowmapContext)

  if (type === 'fluid') return fluid
  return flowmap
}

function FluidSimInner({ children }: { children: React.ReactNode }) {
  const fluid = useFluidSim()
  const parent = use(FlowmapContext)
  return (
    <FlowmapContext.Provider value={{ ...parent, fluid }}>
      {children}
    </FlowmapContext.Provider>
  )
}

function FlowmapSimInner({ children }: { children: React.ReactNode }) {
  const flowmap = useFlowmapSim()
  const parent = use(FlowmapContext)
  return (
    <FlowmapContext.Provider value={{ ...parent, flowmap }}>
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
export function FlowmapProvider({
  children,
  simTypes = [],
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
  return (
    <FlowmapContext.Provider value={{ fluid: null, flowmap: null }}>
      {tree}
    </FlowmapContext.Provider>
  )
}
