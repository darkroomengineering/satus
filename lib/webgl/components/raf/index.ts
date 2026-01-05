import { useThree } from '@react-three/fiber'
import { useTempus } from 'tempus/react'

/**
 * RAF (Request Animation Frame) component for controlling WebGL rendering.
 *
 * Uses tempus for frame timing and manually advances the R3F frame loop.
 * The Canvas uses `frameloop="never"` so this component controls rendering.
 *
 * @param render - Whether to render frames. Set to false to pause rendering.
 */
export function RAF({ render = true }) {
  const advance = useThree((state) => state.advance)

  useTempus(
    (time: number) => {
      if (render) {
        advance(time / 1000)
      }
    },
    {
      priority: 1,
    }
  )

  return null
}
