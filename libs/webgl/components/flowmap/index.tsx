import { useFrame, useThree } from '@react-three/fiber'
import { types } from '@theatre/core'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import type { Texture } from 'three'
import { useCurrentSheet } from '~/libs/theatre'
import { useTheatre } from '~/libs/theatre/hooks/use-theatre'
import FluidSimulation from '~/libs/webgl/utils/fluid-simulation'

type FlowmapContextType = {
  addCallback: (callback: FlowmapCallback) => void
  removeCallback: (callback: FlowmapCallback) => void
}

type FlowmapCallback = (texture: Texture) => void

export const FlowmapContext = createContext<FlowmapContextType>(
  {} as FlowmapContextType
)

export function useFlowmap(callback: FlowmapCallback) {
  const { addCallback, removeCallback } = useContext(FlowmapContext)

  // biome-ignore lint/correctness/useExhaustiveDependencies: callback as deps can trigger infinite re-renders
  useEffect(() => {
    if (!callback) return

    addCallback(callback)

    return () => {
      removeCallback(callback)
    }
  }, [addCallback, removeCallback])

  return useContext(FlowmapContext)
}

export function FlowmapProvider({ children }: { children: React.ReactNode }) {
  const gl = useThree((state) => state.gl)

  const fluidSimulation = useMemo(
    () => new FluidSimulation({ renderer: gl, size: 128 }),
    [gl]
  )

  const sheet = useCurrentSheet()

  useTheatre(
    sheet,
    'fluid simulation',
    {
      density: types.number(0.98, { range: [0, 1], nudgeMultiplier: 0.01 }),
      velocity: types.number(1, { range: [0, 1], nudgeMultiplier: 0.01 }),
      pressure: types.number(0, { range: [0, 1], nudgeMultiplier: 0.01 }),
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
        fluidSimulation.curlStrength = curl
        fluidSimulation.densityDissipation = density
        fluidSimulation.velocityDissipation = velocity
        fluidSimulation.pressureDissipation = pressure
        fluidSimulation.radius = radius
      },
      deps: [fluidSimulation],
    }
  )

  // const [texture, setTexture] = useState()

  const textureRef = useRef()

  // const getTexture = useCallback(() => textureRef.current, [])

  const callbacksRefs = useRef<FlowmapCallback[]>([])

  const addCallback = useCallback((callback: FlowmapCallback) => {
    callbacksRefs.current.push(callback)
  }, [])

  const removeCallback = useCallback((callback: FlowmapCallback) => {
    callbacksRefs.current = callbacksRefs.current.filter(
      (ref) => ref !== callback
    )
  }, [])

  const update = useCallback(() => {
    for (const callback of callbacksRefs.current) {
      callback(textureRef.current as unknown as Texture)
    }
  }, [])

  useFrame(({ gl }) => {
    if (callbacksRefs.current.length === 0) return

    textureRef.current = fluidSimulation.update()
    update()

    gl.setRenderTarget(null)
    gl.clear()
  }, -10)

  return (
    <FlowmapContext.Provider
      value={{
        addCallback,
        removeCallback,
      }}
    >
      {children}
    </FlowmapContext.Provider>
  )
}
