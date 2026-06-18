import { useFrame, useThree } from '@react-three/fiber'
import { types } from '@theatre/core'
import { useEffect, useRef, useState } from 'react'
import { useCurrentSheet } from '@/dev/theatre'
import { useTheatre } from '@/dev/theatre/hooks/use-theatre'
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

  const mouseRef = useRef({
    x: 0,
    y: 0,
    lastTime: 0,
    isInit: false,
    moved: false,
  })

  // Mouse/touch input — drives the flowmap stamp position and velocity
  useEffect(() => {
    if (!flowmap) return

    const updateMouse = (event: MouseEvent | TouchEvent) => {
      let clientX: number
      let clientY: number

      // Handle both mouse and touch events
      if ('changedTouches' in event && event.changedTouches?.length) {
        clientX = event.changedTouches[0]?.clientX ?? 0
        clientY = event.changedTouches[0]?.clientY ?? 0
      } else if ('clientX' in event) {
        clientX = event.clientX
        clientY = event.clientY
      } else {
        return
      }

      const last = mouseRef.current
      const now = performance.now()

      // First input: seed position only, no velocity
      if (!last.isInit) {
        last.isInit = true
        last.x = clientX
        last.y = clientY
        last.lastTime = now
        return
      }

      const deltaX = clientX - last.x
      const deltaY = clientY - last.y
      // Clamp dt to avoid velocity spikes after an idle period / tab switch
      const dt = Math.max(14, now - last.lastTime)

      last.x = clientX
      last.y = clientY
      last.lastTime = now
      last.moved = true

      // Normalized cursor (y flipped into UV space)
      flowmap.mouse.set(clientX / size.width, 1 - clientY / size.height)
      // Pixels per millisecond; the shader flips Y via vec2(1, -1)
      flowmap.velocity.set(deltaX / dt, deltaY / dt)
    }

    const handleMouseMove = (event: MouseEvent) => updateMouse(event)
    const handleTouchMove = (event: TouchEvent) => updateMouse(event)

    window.addEventListener('mousemove', handleMouseMove, false)
    window.addEventListener('touchmove', handleTouchMove, false)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove, false)
      window.removeEventListener('touchmove', handleTouchMove, false)
    }
  }, [flowmap, size.width, size.height])

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
    if (flowmap && !mouseRef.current.moved) {
      // Pointer idle this frame: park off-screen + zero velocity so the
      // existing trail dissipates instead of stamping a fixed smear.
      flowmap.mouse.set(-1, -1)
      flowmap.velocity.set(0, 0)
    }
    mouseRef.current.moved = false
    flowmap?.update()
  }, -10)

  return flowmap
}
