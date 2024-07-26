import { useFrame, useThree } from '@react-three/fiber'
import { types } from '@theatre/core'
import { useCurrentSheet } from 'libs/theatre'
import { useTheatre } from 'libs/theatre/hooks/use-theatre'
import FluidSimulation from 'libs/webgl/utils/fluid-simulation'
import { createContext, useCallback, useContext, useMemo, useRef } from 'react'

export const FlowmapContext = createContext()

export function useFlowmap() {
  return useContext(FlowmapContext)
}

export function FlowmapProvider({ children }) {
  const gl = useThree(({ gl }) => gl)

  const fluidSimulation = useMemo(
    () => new FluidSimulation({ renderer: gl, size: 128 }),
    [gl],
  )

  const sheet = useCurrentSheet()

  useTheatre(
    sheet,
    'fluid simulation',
    {
      density: types.number(0.9, { range: [0, 1], nudgeMultiplier: 0.01 }),
      velocity: types.number(1, { range: [0, 1], nudgeMultiplier: 0.01 }),
      pressure: types.number(0, { range: [0, 1], nudgeMultiplier: 0.01 }),
      curl: types.number(0, { range: [0, 100], nudgeMultiplier: 1 }),
      radius: types.number(0.4, { range: [0, 1], nudgeMultiplier: 0.01 }),
    },
    {
      onValuesChange: ({ density, velocity, pressure, curl, radius }) => {
        fluidSimulation.curlStrength = curl
        fluidSimulation.densityDissipation = density
        fluidSimulation.velocityDissipation = velocity
        fluidSimulation.pressureDissipation = pressure
        fluidSimulation.radius = radius
      },
      deps: [fluidSimulation],
    },
  )

  // const [texture, setTexture] = useState()

  const textureRef = useRef()

  const getTexture = useCallback(() => textureRef.current, [])

  useFrame(({ gl }) => {
    textureRef.current = fluidSimulation.update()

    gl.setRenderTarget(null)
    gl.clear()
  }, -10)

  return (
    <FlowmapContext.Provider value={getTexture}>
      {children}
    </FlowmapContext.Provider>
  )
}
