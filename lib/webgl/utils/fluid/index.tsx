import { useFrame, useThree } from '@react-three/fiber'
import { types } from '@theatre/core'
import { useEffect, useState } from 'react'
import { useCurrentSheet } from '@/dev/theatre'
import { useTheatre } from '@/dev/theatre/hooks/use-theatre'
import { usePointerInput } from '@/webgl/hooks/use-pointer-input'
import { Fluid } from '@/webgl/utils/fluid/fluid-sim'

export function useFluidSim(resolution = 128) {
  const sheet = useCurrentSheet()
  const gl = useThree((state) => state.gl)
  const size = useThree((state) => state.size)

  // Created/destroyed by the effect, keyed on gl + resolution.
  const [fluid, setFluid] = useState<null | Fluid>(null)

  useEffect(() => {
    const fluid = new Fluid(gl, { simRes: resolution })
    setFluid(fluid)
    return () => {
      fluid.destroy()
      setFluid(null)
    }
  }, [resolution, gl])

  // Normalize pointer input and queue splats. The callback always reads the
  // latest `size` and `fluid` via the ref pattern inside usePointerInput.
  usePointerInput((clientX, clientY, dx, dy) => {
    if (!(Math.abs(dx) || Math.abs(dy))) return
    const normalizedX = clientX / size.width
    const normalizedY = 1 - clientY / size.height
    fluid?.addSplat(normalizedX, normalizedY, dx * 5, dy * -5)
  })

  // Update aspect ratio when viewport size changes
  useEffect(() => {
    if (!fluid) return
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
        if (!fluid) return
        fluid.curlStrength = curl
        fluid.densityDissipation = density
        fluid.velocityDissipation = velocity
        fluid.pressureDissipation = pressure
        fluid.radius = radius
      },
      deps: [fluid],
    }
  )

  // Drive the simulation with the real frame delta so it runs at the same
  // apparent speed regardless of display refresh rate.
  useFrame((_, delta) => {
    fluid?.update(delta)
  }, -10)

  return fluid
}
