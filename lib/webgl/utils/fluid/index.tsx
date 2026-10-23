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
import { framesToFade, useLease } from '@/webgl/utils/awake'
import { Fluid } from '@/webgl/utils/fluid/fluid-sim'

export function useFluidSim(
  resolution = 128,
  subscribePointerMove?: ((handler: PointerMoveHandler) => () => void) | null
) {
  const sheet = useCurrentSheet()
  const gl = useThree((state) => state.gl)
  const size = useThree((state) => state.size)

  // Bumped after a WebGL context restore (see webgl.tsx's ContextLossHandler);
  // listed in the deps below so the sim, which sits outside three.js's tracked
  // restore path, is rebuilt.
  const contextGeneration = useSyncExternalStore(
    subscribeContextGeneration,
    getContextGeneration,
    getServerContextGeneration
  )

  // A ref, not state: the instance is mutated imperatively, and the React
  // Compiler cannot optimize a component that constructs-then-setStates an
  // instance in an effect and later mutates that same state value.
  const fluidRef = useRef<null | Fluid>(null)

  useEffect(() => {
    const fluid = new Fluid(gl, { simRes: resolution })
    fluidRef.current = fluid
    return () => {
      fluid.destroy()
      fluidRef.current = null
    }
  }, [resolution, gl, contextGeneration])

  // Dye fades by its dissipation per frame, not per second, so the canvas is
  // held for a frame count rather than woken for a time window: a slow frame
  // rate would otherwise freeze the fluid mid-fade. Only the dye is visible;
  // velocity dissipation can be 1 (no decay), which would hold forever.
  const fadeFramesRef = useRef(0)
  const lease = useLease()
  const holdUntilFaded = (fluid: Fluid) => {
    fadeFramesRef.current = framesToFade(fluid.densityDissipation)
    lease.acquire()
  }

  // Routed through useEffectEvent so it always reads the latest `size` and
  // `fluidRef.current`.
  const handlePointerMove = useEffectEvent(
    (clientX: number, clientY: number, dx: number, dy: number) => {
      const fluid = fluidRef.current
      if (!fluid || !(Math.abs(dx) || Math.abs(dy))) return
      const normalizedX = clientX / size.width
      const normalizedY = 1 - clientY / size.height
      fluid.addSplat(normalizedX, normalizedY, dx * 5, dy * -5)
      holdUntilFaded(fluid)
    }
  )

  // The shared pointer bus is mounted once in FlowmapProvider, so this adds no
  // window listeners of its own.
  useEffect(() => {
    return subscribePointerMove?.(handlePointerMove)
  }, [subscribePointerMove])

  // `gl` and `resolution` are dependencies though not read here: they recreate
  // the instance above, and a fresh Fluid needs its aspect set.
  useEffect(() => {
    const fluid = fluidRef.current
    if (!fluid) return
    fluid.splatMaterial.uniforms.uAspect.value = size.width / size.height
  }, [size, gl, resolution, contextGeneration])

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
        holdUntilFaded(fluid)
      },
      // Re-subscribes when the instance is rebuilt so Theatre re-applies its
      // current values to the new Fluid. A ref's identity never changes, so
      // listing `fluidRef` would never re-subscribe and the initial values
      // would be dropped.
      deps: [gl, resolution, contextGeneration],
    }
  )

  // Real frame delta, so apparent speed is independent of refresh rate.
  useFrame((_, delta) => {
    fluidRef.current?.update(delta)

    if (lease.held && --fadeFramesRef.current <= 0) {
      lease.release()
    }
  }, -10)

  return fluidRef
}
