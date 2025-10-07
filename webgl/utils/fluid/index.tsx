import { useFrame, useThree } from '@react-three/fiber'
import { types } from '@theatre/core'
import { useEffect, useRef } from 'react'
import { useCurrentSheet } from '~/orchestra/theatre'
import { useTheatre } from '~/orchestra/theatre/hooks/use-theatre'
import { Fluid } from '~/webgl/utils/fluid/fluid-sim'

export function useFluidSim() {
  const sheet = useCurrentSheet()
  const gl = useThree((state) => state.gl)
  const size = useThree((state) => state.size)

  // Use ref to ensure fluid is only created once
  const fluidRef = useRef<Fluid | null>(null)
  if (!fluidRef.current) {
    fluidRef.current = new Fluid(gl, { size: 128 })
  }
  const fluid = fluidRef.current

  const lastMouseRef = useRef({ x: 0, y: 0, isInit: false })

  // Setup mouse event listeners
  useEffect(() => {
    const updateMouse = (event: MouseEvent | TouchEvent) => {
      let clientX: number
      let clientY: number

      // Handle both mouse and touch events
      if ('changedTouches' in event && event.changedTouches?.length) {
        clientX = event.changedTouches[0].clientX
        clientY = event.changedTouches[0].clientY
      } else if ('clientX' in event) {
        clientX = event.clientX
        clientY = event.clientY
      } else {
        return
      }

      const lastMouse = lastMouseRef.current

      // First input
      if (!lastMouse.isInit) {
        lastMouse.isInit = true
        lastMouse.x = clientX
        lastMouse.y = clientY
        return
      }

      const deltaX = clientX - lastMouse.x
      const deltaY = clientY - lastMouse.y

      lastMouse.x = clientX
      lastMouse.y = clientY

      // Add if the mouse is moving
      if (Math.abs(deltaX) || Math.abs(deltaY)) {
        const normalizedX = clientX / size.width
        const normalizedY = 1 - clientY / size.height

        // Add splat to fluid simulation
        fluid.addSplat(normalizedX, normalizedY, deltaX * 5, deltaY * -5)
      }
    }

    const handleMouseMove = (event: MouseEvent) => updateMouse(event)
    const handleTouchMove = (event: TouchEvent) => updateMouse(event)

    // Add event listeners
    window.addEventListener('mousemove', handleMouseMove, false)
    window.addEventListener('touchmove', handleTouchMove, false)

    // Cleanup function
    return () => {
      window.removeEventListener('mousemove', handleMouseMove, false)
      window.removeEventListener('touchmove', handleTouchMove, false)
    }
  }, [fluid, size.width, size.height])

  // Update aspect ratio when viewport size changes
  useEffect(() => {
    fluid.splatMaterial.uniforms.uAspect.value = size.width / size.height
  }, [size, fluid])

  // Theatre.js controls for fluid parameters
  useTheatre(
    sheet,
    'fluid simulation',
    {
      density: types.number(0.98, { range: [0, 1], nudgeMultiplier: 0.01 }),
      velocity: types.number(1, { range: [0, 1], nudgeMultiplier: 0.01 }),
      pressure: types.number(0.5, { range: [0, 1], nudgeMultiplier: 0.01 }),
      curl: types.number(0, { range: [0, 100], nudgeMultiplier: 1 }),
      radius: types.number(0.5, { range: [0, 1], nudgeMultiplier: 0.01 }),
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
        fluid.curlStrength = curl
        fluid.densityDissipation = density
        fluid.velocityDissipation = velocity
        fluid.pressureDissipation = pressure
        fluid.radius = radius
      },
      deps: [fluid],
    }
  )

  // Update fluid simulation each frame
  useFrame(() => {
    fluid.update()
  }, -10)

  return fluid
}
