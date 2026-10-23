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
import { Flowmap } from '@/webgl/utils/flowmaps/flowmap-sim'

export function useFlowmapSim(
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
  const flowmapRef = useRef<Flowmap | null>(null)

  useEffect(() => {
    const flowmap = new Flowmap(gl, { size: resolution })
    flowmapRef.current = flowmap
    return () => {
      flowmap.destroy()
      flowmapRef.current = null
    }
  }, [gl, resolution, contextGeneration])

  // `movedRef`: pointer moved this frame (idle detection in useFrame).
  // `lastTimeRef`: timestamp of the last event (velocity calculation).
  const movedRef = useRef(false)
  const lastTimeRef = useRef<number | null>(null)

  // The trail fades by `dissipation` per frame, not per second, so the canvas
  // is held for a frame count rather than woken for a time window: a slow
  // frame rate would otherwise freeze the trail mid-fade.
  const fadeFramesRef = useRef(0)
  const lease = useLease()
  const holdUntilFaded = (dissipation: number) => {
    fadeFramesRef.current = framesToFade(dissipation)
    lease.acquire()
  }

  // Routed through useEffectEvent so it always reads the latest `size` and
  // `flowmapRef.current`.
  const handlePointerMove = useEffectEvent(
    (clientX: number, clientY: number, dx: number, dy: number) => {
      const flowmap = flowmapRef.current
      if (!flowmap) return

      const now = performance.now()
      // Safe default on the first call; clamped to avoid velocity spikes after
      // an idle period or tab switch.
      const dt =
        lastTimeRef.current !== null
          ? Math.max(14, now - lastTimeRef.current)
          : 16
      lastTimeRef.current = now
      movedRef.current = true
      holdUntilFaded(flowmap.dissipation)

      // Cursor in UV space (y flipped)
      flowmap.mouse.set(clientX / size.width, 1 - clientY / size.height)
      // Pixels per millisecond; the shader flips Y via vec2(1, -1)
      flowmap.velocity.set(dx / dt, dy / dt)
    }
  )

  // The shared pointer bus is mounted once in FlowmapProvider, so this adds no
  // window listeners of its own.
  useEffect(() => {
    return subscribePointerMove?.(handlePointerMove)
  }, [subscribePointerMove])

  // Keeps the cursor falloff round. `gl` and `resolution` are dependencies
  // though not read here: they recreate the instance above, and a fresh
  // Flowmap needs its aspect set.
  useEffect(() => {
    const flowmap = flowmapRef.current
    if (!flowmap) return
    flowmap.material.uniforms.uAspect.value = size.width / size.height
  }, [size, gl, resolution, contextGeneration])

  useTheatre(
    sheet,
    'flowmap',
    {
      falloff: { value: 0.2, range: [0, 1], nudgeMultiplier: 0.01 },
      dissipation: { value: 0.98, range: [0, 1], nudgeMultiplier: 0.01 },
    },
    {
      onValuesChange: ({
        falloff,
        dissipation,
      }: {
        falloff: number
        dissipation: number
      }) => {
        const flowmap = flowmapRef.current
        if (!flowmap) return
        flowmap.falloff = falloff
        flowmap.dissipation = dissipation
        holdUntilFaded(dissipation)
      },
      // Re-subscribes when the instance is rebuilt so Theatre re-applies its
      // current values to the new Flowmap. A ref's identity never changes, so
      // listing `flowmapRef` would never re-subscribe and the initial values
      // would be dropped.
      deps: [gl, resolution, contextGeneration],
    }
  )

  useFrame(() => {
    const flowmap = flowmapRef.current
    if (flowmap && !movedRef.current) {
      // Pointer idle: park off-screen with zero velocity so the existing trail
      // dissipates instead of stamping a fixed smear.
      flowmap.mouse.set(-1, -1)
      flowmap.velocity.set(0, 0)
    }
    movedRef.current = false
    flowmap?.update()

    if (lease.held && --fadeFramesRef.current <= 0) {
      lease.release()
    }
  }, -10)

  return flowmapRef
}
