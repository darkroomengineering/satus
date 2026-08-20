import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useEffectEvent, useRef, useSyncExternalStore } from 'react'

import { useCurrentSheet } from '@/dev/theatre'
import { useTheatre } from '@/dev/theatre/hooks/use-theatre'
import type { PointerMoveHandler } from '@/webgl/hooks/use-pointer-input'
import {
  getContextGeneration,
  getServerContextGeneration,
  subscribeContextGeneration,
} from '@/webgl/store'
import { Fluid } from '@/webgl/utils/fluid/fluid-sim'

export function useFluidSim(
  resolution = 128,
  subscribePointerMove?: ((handler: PointerMoveHandler) => () => void) | null
) {
  const sheet = useCurrentSheet()
  const gl = useThree((state) => state.gl)
  const size = useThree((state) => state.size)

  // Bumped after a WebGL context restore (see webgl.tsx's ContextLossHandler)
  // — included below so the create/destroy effect replays and rebuilds the
  // sim, which sits outside three.js's own tracked-restore path.
  const contextGeneration = useSyncExternalStore(
    subscribeContextGeneration,
    getContextGeneration,
    getServerContextGeneration
  )

  // Created/destroyed by the effect, keyed on gl + resolution. Held in a ref
  // (not state) because the instance is mutated imperatively below — the
  // React Compiler cannot optimize a component that constructs-then-setStates
  // an instance in an effect and later mutates that same state value.
  const fluidRef = useRef<null | Fluid>(null)

  useEffect(() => {
    const fluid = new Fluid(gl, { simRes: resolution })
    fluidRef.current = fluid
    return () => {
      fluid.destroy()
      fluidRef.current = null
    }
  }, [resolution, gl, contextGeneration])

  // Normalize pointer input and queue splats. The handler always reads the
  // latest `size` and `fluidRef.current`, because it's routed through
  // useEffectEvent — same guarantee usePointerInput itself gives its callers.
  const handlePointerMove = useEffectEvent(
    (clientX: number, clientY: number, dx: number, dy: number) => {
      if (!(Math.abs(dx) || Math.abs(dy))) return
      const normalizedX = clientX / size.width
      const normalizedY = 1 - clientY / size.height
      fluidRef.current?.addSplat(normalizedX, normalizedY, dx * 5, dy * -5)
    }
  )

  // Subscribes to the shared pointer bus (mounted once in FlowmapProvider)
  // instead of mounting its own window listeners — see usePointerInputSubscribe.
  useEffect(() => {
    return subscribePointerMove?.(handlePointerMove)
  }, [subscribePointerMove])

  // Update aspect ratio when viewport size changes.
  //
  // `gl` and `resolution` are dependencies even though they are not read here:
  // they are what recreates the instance above, and a fresh Fluid needs its
  // aspect set. Before the instance moved into a ref, the old `fluid` state
  // value in this list did that job.
  useEffect(() => {
    const fluid = fluidRef.current
    if (!fluid) return
    fluid.splatMaterial.uniforms.uAspect.value = size.width / size.height
  }, [size, gl, resolution, contextGeneration])

  // Theatre.js controls for fluid parameters
  useTheatre(
    sheet,
    'fluid simulation',
    {
      density: { value: 0.98, range: [0, 1], nudgeMultiplier: 0.01 },
      velocity: { value: 1, range: [0, 1], nudgeMultiplier: 0.01 },
      pressure: { value: 0.5, range: [0, 1], nudgeMultiplier: 0.01 },
      curl: { value: 0, range: [0, 100], nudgeMultiplier: 1 },
      radius: { value: 0.5, range: [0, 1], nudgeMultiplier: 0.01 },
    },
    {
      onValuesChange: ({
        density,
        velocity,
        pressure,
        curl,
        radius,
      }: {
        density: number
        velocity: number
        pressure: number
        curl: number
        radius: number
      }) => {
        const fluid = fluidRef.current
        if (!fluid) return
        fluid.curlStrength = curl
        fluid.densityDissipation = density
        fluid.velocityDissipation = velocity
        fluid.pressureDissipation = pressure
        fluid.radius = radius
      },
      // Re-subscribe whenever the instance is rebuilt, so Theatre re-applies
      // its current values to the new Fluid. A ref's identity never changes,
      // so listing `fluidRef` here would mean never re-subscribing, and the
      // initial values would be dropped on the floor.
      deps: [gl, resolution, contextGeneration],
    }
  )

  // Drive the simulation with the real frame delta so it runs at the same
  // apparent speed regardless of display refresh rate.
  useFrame((_, delta) => {
    fluidRef.current?.update(delta)
  }, -10)

  return fluidRef
}
