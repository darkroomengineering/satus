import { useFrame, useThree } from '@react-three/fiber'
import { types } from '@theatre/core'
import { useEffect, useRef, useState } from 'react'
import { useCurrentSheet } from '@/dev/theatre'
import { useTheatre } from '@/dev/theatre/hooks/use-theatre'
import { usePointerInput } from '@/webgl/hooks/use-pointer-input'
import { Flowmap } from '@/webgl/utils/flowmaps/flowmap-sim'

export function useFlowmapSim(resolution = 128) {
  const sheet = useCurrentSheet()
  const gl = useThree((state) => state.gl)
  const size = useThree((state) => state.size)

  // Created/destroyed by the effect, keyed on gl + resolution.
  const [flowmap, setFlowmap] = useState<Flowmap | null>(null)

  useEffect(() => {
    const flowmap = new Flowmap(gl, { size: resolution })
    setFlowmap(flowmap)
    return () => {
      flowmap.destroy()
      setFlowmap(null)
    }
  }, [gl, resolution])

  // Track whether the pointer moved this frame (for idle detection in useFrame)
  // and the timestamp of the last event (for velocity calculation).
  const movedRef = useRef(false)
  const lastTimeRef = useRef<number | null>(null)

  // Mouse/touch input — drives the flowmap stamp position and velocity.
  // The callback always reads the latest `size` and `flowmap` via the ref
  // pattern inside usePointerInput.
  usePointerInput((clientX, clientY, dx, dy) => {
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
  })

  // Aspect ratio so the cursor falloff stays round
  useEffect(() => {
    if (!flowmap) return
    flowmap.material.uniforms.uAspect.value = size.width / size.height
  }, [flowmap, size])

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
        if (!flowmap) return
        flowmap.falloff = falloff
        flowmap.dissipation = dissipation
      },
      deps: [flowmap],
    }
  )

  useFrame(() => {
    if (flowmap && !movedRef.current) {
      // Pointer idle this frame: park off-screen + zero velocity so the
      // existing trail dissipates instead of stamping a fixed smear.
      flowmap.mouse.set(-1, -1)
      flowmap.velocity.set(0, 0)
    }
    movedRef.current = false
    flowmap?.update()
  }, -10)

  return flowmap
}
