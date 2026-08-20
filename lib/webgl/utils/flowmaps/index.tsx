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
import { Flowmap } from '@/webgl/utils/flowmaps/flowmap-sim'

export function useFlowmapSim(
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
  const flowmapRef = useRef<Flowmap | null>(null)

  useEffect(() => {
    const flowmap = new Flowmap(gl, { size: resolution })
    flowmapRef.current = flowmap
    return () => {
      flowmap.destroy()
      flowmapRef.current = null
    }
  }, [gl, resolution, contextGeneration])

  // Track whether the pointer moved this frame (for idle detection in useFrame)
  // and the timestamp of the last event (for velocity calculation).
  const movedRef = useRef(false)
  const lastTimeRef = useRef<number | null>(null)

  // Mouse/touch input — drives the flowmap stamp position and velocity.
  // The handler always reads the latest `size` and `flowmapRef.current`,
  // because it's routed through useEffectEvent — same guarantee
  // usePointerInput itself gives its callers.
  const handlePointerMove = useEffectEvent(
    (clientX: number, clientY: number, dx: number, dy: number) => {
      const flowmap = flowmapRef.current
      if (!flowmap) return

      const now = performance.now()
      // Use a safe default on the very first call; clamp to avoid velocity spikes
      // after an idle period or tab switch.
      const dt =
        lastTimeRef.current !== null
          ? Math.max(14, now - lastTimeRef.current)
          : 16
      lastTimeRef.current = now
      movedRef.current = true

      // Normalized cursor (y flipped into UV space)
      flowmap.mouse.set(clientX / size.width, 1 - clientY / size.height)
      // Pixels per millisecond; the shader flips Y via vec2(1, -1)
      flowmap.velocity.set(dx / dt, dy / dt)
    }
  )

  // Subscribes to the shared pointer bus (mounted once in FlowmapProvider)
  // instead of mounting its own window listeners — see usePointerInputSubscribe.
  useEffect(() => {
    return subscribePointerMove?.(handlePointerMove)
  }, [subscribePointerMove])

  // Aspect ratio so the cursor falloff stays round
  // `gl` and `resolution` are dependencies even though they are not read here:
  // they are what recreates the instance above, and a fresh Flowmap needs its
  // aspect set. Before the instance moved into a ref, the old `flowmap` state
  // value in this list did that job.
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
      },
      // Re-subscribe whenever the instance is rebuilt, so Theatre re-applies
      // its current values to the new Flowmap. A ref's identity never changes,
      // so listing `flowmapRef` here would mean never re-subscribing, and the
      // initial values would be dropped on the floor.
      deps: [gl, resolution, contextGeneration],
    }
  )

  useFrame(() => {
    const flowmap = flowmapRef.current
    if (flowmap && !movedRef.current) {
      // Pointer idle this frame: park off-screen + zero velocity so the
      // existing trail dissipates instead of stamping a fixed smear.
      flowmap.mouse.set(-1, -1)
      flowmap.velocity.set(0, 0)
    }
    movedRef.current = false
    flowmap?.update()
  }, -10)

  return flowmapRef
}
